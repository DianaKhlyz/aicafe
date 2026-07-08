"""Клиент iikoCloud API (api-ru.iiko.services).

Заготовка: реальная реализация появится после получения apiLogin
(~месяц от 2026-07-08, тариф Pro). Каждый метод помечен эндпоинтом,
который будет использовать; чек-лист проверок на песочнице —
в docs/open-questions.md, раздел 3.
"""

import httpx

from app import schemas
from app.config import settings

BASE_URL = "https://api-ru.iiko.services/api/1"


class CloudIikoClient:
    def __init__(self) -> None:
        self._http = httpx.AsyncClient(base_url=BASE_URL, timeout=15)
        self._token: str | None = None

    async def _auth(self) -> str:
        # POST /access_token {apiLogin} -> token (живёт ~1 час, кэшируем в памяти)
        raise NotImplementedError("Ожидаем apiLogin от дилера iiko")

    async def get_menu(self) -> schemas.Menu:
        # Внешнее меню: POST /api/2/menu/by_id — витринный контент из iikoWeb.
        # Картинки скачиваем и кэшируем локально (services/menu.py), не хотлинкаем.
        raise NotImplementedError

    async def get_stop_list(self) -> set[str]:
        # POST /stop_lists; актуализация — вебхуком StopListUpdate
        raise NotImplementedError

    async def get_delivery_zones(self) -> list[schemas.DeliveryZone]:
        # POST /delivery_restrictions
        raise NotImplementedError

    async def create_delivery_order(self, request: schemas.CheckoutRequest) -> str:
        # POST /deliveries/create
        raise NotImplementedError

    async def create_pickup_order(self, request: schemas.CheckoutRequest) -> str:
        # POST /deliveries/create с типом «самовывоз» и completeBefore = desired_time
        raise NotImplementedError

    async def create_table_order(self, request: schemas.CheckoutRequest) -> str:
        # POST /order/create с tableIds (заказ на стол, режим /t/{code})
        raise NotImplementedError

    async def get_active_order_count(self) -> int:
        # Для ETA: активные заказы по организации (уточнить оптимальный
        # источник на песочнице — выборка заказов или счётчики)
        raise NotImplementedError

    async def get_sections(self) -> list[schemas.Section]:
        # POST /reserve/available_restaurant_sections (+ занятость из резервов)
        raise NotImplementedError

    async def create_reserve(self, request: schemas.ReserveRequest) -> schemas.ReserveView:
        # POST /reserve/create
        raise NotImplementedError

    def _organization_id(self) -> str:
        return settings.iiko_organization_ids[0]
