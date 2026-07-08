from functools import lru_cache

from app.adapters.payments.base import PaymentProvider
from app.adapters.payments.stub import StubPaymentProvider


@lru_cache(maxsize=1)
def get_payment_provider() -> PaymentProvider:
    # Реальный адаптер подключим, когда заказчик определится с банком
    return StubPaymentProvider()
