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


staff_notifier = TelegramStaffNotifier()
