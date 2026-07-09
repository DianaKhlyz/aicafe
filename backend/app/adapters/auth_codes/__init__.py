from functools import lru_cache

from app.adapters.auth_codes.base import CodeProvider
from app.adapters.auth_codes.stub import StubCodeProvider


@lru_cache(maxsize=1)
def get_code_provider() -> CodeProvider:
    # Боевой провайдер (flash-call / Telegram Gateway) — после выбора заказчиком
    return StubCodeProvider()
