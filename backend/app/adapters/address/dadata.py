"""DaData «Подсказки»: боевой провайдер адресов.

Включается автоматически, когда в конфиге задан AICAFE_DADATA_API_KEY.
Бесплатный тариф: 10 000 запросов/день (символ ввода = запрос, один адрес
~10–30 запросов). При превышении DaData отвечает 403 до конца суток —
деньги не списываются; в этом случае отдаём пустой список, а гость
вводит адрес руками (заказ не блокируется).
"""

import httpx

from app import schemas
from app.config import settings

SUGGEST_URL = "https://suggestions.dadata.ru/suggestions/api/4_1/rs/suggest/address"


class DadataAddressProvider:
    def __init__(self) -> None:
        self._http = httpx.AsyncClient(
            timeout=5,
            headers={
                "Authorization": f"Token {settings.dadata_api_key}",
                "Content-Type": "application/json",
            },
        )

    async def suggest(self, query: str) -> list[schemas.AddressSuggestion]:
        try:
            response = await self._http.post(
                SUGGEST_URL,
                json={"query": query, "count": 6, "from_bound": {"value": "street"}},
            )
            response.raise_for_status()
        except httpx.HTTPError:
            return []
        suggestions = []
        for item in response.json().get("suggestions", []):
            data = item.get("data") or {}
            lat, lon = data.get("geo_lat"), data.get("geo_lon")
            if lat and lon:
                suggestions.append(
                    schemas.AddressSuggestion(
                        value=item["value"], lat=float(lat), lon=float(lon)
                    )
                )
        return suggestions
