"""Смены персонала через Telegram-бота (фаза А).

Механика: сотрудник в личке бота жмёт «Я на смене» → бот выдаёт
персональную одноразовую invite-ссылку в рабочую группу (бот не может
добавить человека сам — ограничение Telegram). «Уйти со смены» /
чистка в конце дня — мягкий кик (ban + unban, без бана), завтра
можно вернуться по новой ссылке. «Постоянно на смене» — флаг, который
чистка не трогает. Группа должна быть супергруппой с видимой историей,
бот — админом с правами приглашать и удалять участников.

Фаза Б (после apiLogin): вебхук iiko PersonalShift открывает/закрывает
смену автоматически по пробитию на кассе — обработчик уже готов,
активируется привязкой iiko_employee_id у сотрудника.
"""

import logging
from datetime import UTC, datetime, timedelta
from typing import Any
from zoneinfo import ZoneInfo

import httpx
from sqlalchemy import select

from app.config import settings
from app.db import session_factory
from app.models import StaffMember, StaffShift

logger = logging.getLogger(__name__)

INVITE_LINK_TTL = timedelta(hours=1)

MENU_KEYBOARD = {
    "inline_keyboard": [
        [{"text": "✅ Я на смене", "callback_data": "shift_on"}],
        [{"text": "🚪 Уйти со смены", "callback_data": "shift_off"}],
        [{"text": "📋 Сегодня на смене", "callback_data": "shift_list"}],
        [{"text": "📌 Постоянно на смене", "callback_data": "shift_permanent"}],
    ]
}

MENU_TEXT = (
    "Бот смен кафе.\n"
    "«Я на смене» — получите ссылку в рабочую группу до конца дня.\n"
    "«Постоянно на смене» — для руководства: чистка в конце дня не выселяет.\n"
    "«Уйти со смены» — выход из группы в любой момент."
)


def _cafe_tz() -> ZoneInfo:
    return ZoneInfo(settings.iiko_terminal_timezone)


def _today() -> str:
    return datetime.now(_cafe_tz()).strftime("%Y-%m-%d")


def _display_name(user: dict[str, Any]) -> str:
    name = " ".join(filter(None, [user.get("first_name"), user.get("last_name")]))
    return name or user.get("username") or str(user["id"])


class StaffShiftBot:
    def __init__(self, transport: httpx.AsyncBaseTransport | None = None) -> None:
        self._http = httpx.AsyncClient(timeout=10, transport=transport)

    @property
    def enabled(self) -> bool:
        return bool(settings.telegram_bot_token and settings.telegram_staff_chat_id)

    async def _call(self, method: str, payload: dict[str, Any]) -> Any:
        try:
            response = await self._http.post(
                f"https://api.telegram.org/bot{settings.telegram_bot_token}/{method}",
                json=payload,
            )
            data = response.json()
        except httpx.HTTPError:
            logger.exception("Telegram %s недоступен", method)
            return None
        if not data.get("ok"):
            logger.warning("Telegram %s: %s", method, data.get("description"))
            return None
        return data.get("result")

    async def setup_webhook(self) -> None:
        """Регистрация вебхука бота при старте (аналог ensure_webhooks iiko)."""
        if not (self.enabled and settings.public_base_url):
            return
        await self._call(
            "setWebhook",
            {
                "url": f"{settings.public_base_url}/api/webhooks/telegram",
                "secret_token": settings.telegram_webhook_secret or None,
                "allowed_updates": ["message", "callback_query"],
            },
        )

    # --- Обработка апдейтов ----------------------------------------------------

    async def handle_update(self, update: dict[str, Any]) -> None:
        if not self.enabled:
            return
        message = update.get("message")
        if message and message.get("chat", {}).get("type") == "private":
            await self._call(
                "sendMessage",
                {
                    "chat_id": message["chat"]["id"],
                    "text": MENU_TEXT,
                    "reply_markup": MENU_KEYBOARD,
                },
            )
            return
        callback = update.get("callback_query")
        if callback:
            await self._handle_callback(callback)

    async def _handle_callback(self, callback: dict[str, Any]) -> None:
        user = callback["from"]
        match callback.get("data"):
            case "shift_on":
                text = await self._shift_on(user, permanent=False)
            case "shift_permanent":
                text = await self._shift_on(user, permanent=True)
            case "shift_off":
                text = await self._shift_off(user["id"])
            case "shift_list":
                text = await self.shift_list_text()
            case _:
                text = None
        await self._call("answerCallbackQuery", {"callback_query_id": callback["id"]})
        if text:
            await self._call("sendMessage", {"chat_id": user["id"], "text": text})

    # --- Логика смен -------------------------------------------------------------

    async def _shift_on(self, user: dict[str, Any], permanent: bool) -> str:
        async with session_factory() as session:
            member = await session.get(StaffMember, user["id"])
            if member is None:
                member = StaffMember(tg_user_id=user["id"], display_name=_display_name(user))
                session.add(member)
            member.display_name = _display_name(user)
            if permanent:
                member.permanent = True
            active = await self._active_shift(session, user["id"])
            if active is None:
                session.add(StaffShift(tg_user_id=user["id"], day=_today()))
            await session.commit()

        link = await self._invite_link(_display_name(user))
        base = (
            "Вы отмечены как «постоянно на смене» — чистка в конце дня вас не выселяет."
            if permanent
            else "Вы на смене до конца дня."
        )
        if link:
            return f"{base}\nВход в рабочую группу: {link}\nСсылка личная и одноразовая."
        return f"{base}\nНе получилось создать ссылку в группу — сообщите управляющему."

    async def _shift_off(self, tg_user_id: int) -> str:
        async with session_factory() as session:
            member = await session.get(StaffMember, tg_user_id)
            if member is not None:
                member.permanent = False
            shift = await self._active_shift(session, tg_user_id)
            if shift is not None:
                shift.ended_at = datetime.now(UTC)
            await session.commit()
        await self._kick(tg_user_id)
        return "Вы сняты со смены и выведены из группы. Хорошего отдыха!"

    async def shift_list_text(self) -> str:
        tz = _cafe_tz()
        async with session_factory() as session:
            members = {
                member.tg_user_id: member
                for member in (await session.execute(select(StaffMember))).scalars()
            }
            shifts = (
                (
                    await session.execute(
                        select(StaffShift).where(
                            StaffShift.day == _today(), StaffShift.ended_at.is_(None)
                        )
                    )
                )
                .scalars()
                .all()
            )
        lines = []
        on_shift_ids = set()
        for shift in shifts:
            member = members.get(shift.tg_user_id)
            name = member.display_name if member else str(shift.tg_user_id)
            started = shift.started_at.replace(tzinfo=UTC).astimezone(tz)
            on_shift_ids.add(shift.tg_user_id)
            lines.append(f"• {name} — с {started:%H:%M}")
        for member in members.values():
            if member.permanent and member.tg_user_id not in on_shift_ids:
                lines.append(f"• {member.display_name} — 📌 постоянно")
        if not lines:
            return "Сегодня пока никто не отметился на смене."
        return "Сегодня на смене:\n" + "\n".join(sorted(lines))

    async def end_of_day_cleanup(self) -> None:
        """Чистка в конце дня: снимает и выселяет всех непостоянных.

        Час запуска — settings.shift_end_hour (граница обсуждается
        с заказчиком: для ночных смен подойдёт час закрытия кафе).
        """
        if not self.enabled:
            return
        async with session_factory() as session:
            shifts = (
                (
                    await session.execute(
                        select(StaffShift).where(StaffShift.ended_at.is_(None))
                    )
                )
                .scalars()
                .all()
            )
            members = {
                member.tg_user_id: member
                for member in (await session.execute(select(StaffMember))).scalars()
            }
            to_kick = []
            for shift in shifts:
                member = members.get(shift.tg_user_id)
                if member is not None and member.permanent:
                    continue
                shift.ended_at = datetime.now(UTC)
                to_kick.append(shift.tg_user_id)
            await session.commit()
        for tg_user_id in to_kick:
            await self._kick(tg_user_id)
        if to_kick:
            logger.info("Чистка смен: выведено %d сотрудников", len(to_kick))

    async def handle_iiko_personal_shift(self, employee_id: str, opened: bool) -> None:
        """Фаза Б: смена пробита на кассе iiko -> зеркалим в Telegram.

        Работает для сотрудников с заполненной привязкой iiko_employee_id.
        """
        async with session_factory() as session:
            member = (
                await session.execute(
                    select(StaffMember).where(StaffMember.iiko_employee_id == employee_id)
                )
            ).scalar_one_or_none()
        if member is None:
            return
        if opened:
            text = await self._shift_on(
                {"id": member.tg_user_id, "first_name": member.display_name},
                permanent=False,
            )
            await self._call(
                "sendMessage",
                {"chat_id": member.tg_user_id, "text": f"Смена в iiko открыта. {text}"},
            )
        else:
            await self._shift_off(member.tg_user_id)
            await self._call(
                "sendMessage",
                {
                    "chat_id": member.tg_user_id,
                    "text": "Смена в iiko закрыта — сняли вас со смены.",
                },
            )

    # --- Вспомогательное -----------------------------------------------------------

    async def _active_shift(self, session, tg_user_id: int) -> StaffShift | None:
        return (
            await session.execute(
                select(StaffShift).where(
                    StaffShift.tg_user_id == tg_user_id,
                    StaffShift.day == _today(),
                    StaffShift.ended_at.is_(None),
                )
            )
        ).scalar_one_or_none()

    async def _invite_link(self, name: str) -> str | None:
        expire = int((datetime.now(UTC) + INVITE_LINK_TTL).timestamp())
        result = await self._call(
            "createChatInviteLink",
            {
                "chat_id": settings.telegram_staff_chat_id,
                "member_limit": 1,
                "expire_date": expire,
                "name": f"смена: {name}"[:32],
            },
        )
        return result.get("invite_link") if result else None

    async def _kick(self, tg_user_id: int) -> None:
        """Мягкий кик: удалить из группы без бана — завтра можно вернуться."""
        await self._call(
            "banChatMember",
            {"chat_id": settings.telegram_staff_chat_id, "user_id": tg_user_id},
        )
        await self._call(
            "unbanChatMember",
            {
                "chat_id": settings.telegram_staff_chat_id,
                "user_id": tg_user_id,
                "only_if_banned": True,
            },
        )


staff_bot = StaffShiftBot()
