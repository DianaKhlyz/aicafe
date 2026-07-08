"""Заглушка эквайринга: в dev-режиме платёж «оплачивается» сразу."""

import itertools

from app.adapters.payments.base import PaymentIntent


class StubPaymentProvider:
    def __init__(self) -> None:
        self._seq = itertools.count(1)

    async def create_payment(self, order_id: str, amount: float) -> PaymentIntent:
        payment_id = f"stub-pay-{next(self._seq)}"
        return PaymentIntent(id=payment_id, url=f"/pay/stub/{payment_id}", status="paid")

    async def get_status(self, payment_id: str) -> str:
        return "paid"
