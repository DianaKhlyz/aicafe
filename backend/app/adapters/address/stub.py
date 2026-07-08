"""Мок-подсказки адресов: покрывают все сценарии зон из мок-клиента iiko
(внутри зоны «Центр», только в «Расширенной», вне всех зон)."""

from app import schemas

_ADDRESSES = [
    schemas.AddressSuggestion(value="ул Тверская, д 7", lat=55.757, lon=37.612),
    schemas.AddressSuggestion(value="ул Тверская, д 21", lat=55.762, lon=37.607),
    schemas.AddressSuggestion(value="Ленинградский пр-кт, д 15", lat=55.72, lon=37.60),
    schemas.AddressSuggestion(value="г Зеленоград, к 305", lat=55.60, lon=37.40),
]


class StubAddressProvider:
    async def suggest(self, query: str) -> list[schemas.AddressSuggestion]:
        needle = query.strip().lower()
        return [a for a in _ADDRESSES if needle in a.value.lower()] or list(_ADDRESSES)
