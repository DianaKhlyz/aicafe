"""Уведомления персоналу в Telegram: новые заказы и брони с сайта.

Включается настройками AICAFE_TELEGRAM_BOT_TOKEN + AICAFE_TELEGRAM_STAFF_CHAT_ID
(бот создаётся у @BotFather за 5 минут, chat_id — id рабочей группы).
Сбой уведомления никогда не роняет заказ — только пишет в лог.
"""

import logging

import httpx

from app.config import settings

logger = logging.getLogger(__name__)


class TelegramStaffNotifier:
    def __init__(self) -> None:
        self._http = httpx.AsyncClient(timeout=5)

    @property
    def enabled(self) -> bool:
        return bool(settings.telegram_bot_token and settings.telegram_staff_chat_id)

    async def notify(self, text: str) -> None:
        if not self.enabled:
            return
        try:
            response = await self._http.post(
                f"https://api.telegram.org/bot{settings.telegram_bot_token}/sendMessage",
                json={"chat_id": settings.telegram_staff_chat_id, "text": text},
            )
            response.raise_for_status()
        except httpx.HTTPError:
            logger.exception("Не удалось отправить уведомление персоналу в Telegram")

    async def send_test(self) -> dict[str, object]:
        """Для демо-пульта: пробная отправка с человекочитаемой диагностикой."""
        if not self.enabled:
            return {
                "enabled": False,
                "ok": False,
                "detail": "Не заданы AICAFE_TELEGRAM_BOT_TOKEN и/или "
                "AICAFE_TELEGRAM_STAFF_CHAT_ID (см. deploy/demo-install.md)",
            }
        try:
            response = await self._http.post(
                f"https://api.telegram.org/bot{settings.telegram_bot_token}/sendMessage",
                json={
                    "chat_id": settings.telegram_staff_chat_id,
                    "text": "Тестовое уведомление с демо-пульта — связь работает ✅",
                },
            )
            data = response.json()
        except httpx.HTTPError as exc:
            return {"enabled": True, "ok": False, "detail": f"Сеть: {exc}"}
        if data.get("ok"):
            return {"enabled": True, "ok": True, "detail": "Отправлено — проверьте группу"}
        # Типичные ответы Telegram: chat not found (неверный chat_id),
        # Unauthorized (неверный токен), bot is not a member (бот не в группе)
        return {"enabled": True, "ok": False, "detail": str(data.get("description"))}


staff_notifier = TelegramStaffNotifier()
