"""Заглушка провайдера кодов: в дев-режиме подходит код 0000.

Боевой провайдер (flash-call / Telegram Gateway) подключится тем же
интерфейсом, когда согласуем выбор (docs/open-questions.md, вопрос 5).
"""

import logging

logger = logging.getLogger(__name__)

DEV_CODE = "0000"


class StubCodeProvider:
    async def send_code(self, phone: str) -> None:
        logger.info("Заглушка кодов: на %s «отправлен» код %s", phone, DEV_CODE)

    async def verify_code(self, phone: str, code: str) -> bool:
        return code == DEV_CODE
