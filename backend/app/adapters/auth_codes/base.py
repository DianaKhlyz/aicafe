"""Контракт провайдера кодов подтверждения (авторизация по телефону).

Кандидаты: flash-call (zvonok.com, SMS.RU, new-tel) и Telegram Gateway.
SMS не используем (см. docs/architecture.md, раздел 7). Подключается
на этапе личного кабинета — сменный адаптер, разработку не блокирует.
"""

from typing import Protocol


class CodeProvider(Protocol):
    async def send_code(self, phone: str) -> None: ...

    async def verify_code(self, phone: str, code: str) -> bool: ...
