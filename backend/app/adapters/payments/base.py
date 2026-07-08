"""Контракт платёжного провайдера.

Банк эквайринга заказчик уточнит позже (см. docs/open-questions.md, вопрос 4).
Адаптер под конкретный банк (Т-Банк / Сбер / ЮKassa / CloudPayments) пишется
без изменения остального кода: модель у всех одинаковая —
создать платёж -> редирект или СБП-deeplink -> вебхук об оплате.
"""

from dataclasses import dataclass
from typing import Protocol


@dataclass
class PaymentIntent:
    id: str
    # Ссылка для оплаты: форма карты или СБП-deeplink
    url: str
    status: str  # pending | paid | failed


class PaymentProvider(Protocol):
    async def create_payment(self, order_id: str, amount: float) -> PaymentIntent: ...

    async def get_status(self, payment_id: str) -> str: ...
