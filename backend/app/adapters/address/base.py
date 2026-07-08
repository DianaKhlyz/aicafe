"""Контракт провайдера подсказок адресов.

Реализации: заглушка (мок-адреса для разработки) и DaData (включается
ключом AICAFE_DADATA_API_KEY — бесплатный тариф 10 000 запросов/день,
регистрируется на аккаунт заказчика).
"""

from typing import Protocol

from app import schemas


class AddressProvider(Protocol):
    async def suggest(self, query: str) -> list[schemas.AddressSuggestion]: ...
