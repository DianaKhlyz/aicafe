"""Контракт клиента iiko.

Реализации: MockIikoClient (мок-данные, пока нет apiLogin) и
CloudIikoClient (iikoCloud API, включается настройкой AICAFE_IIKO_MOCK=false).
Весь остальной код зависит только от этого протокола.
"""

from typing import Protocol

from app import schemas


class IikoClient(Protocol):
    # Меню: внешнее меню iiko (api/2/menu) — витринные названия, описания,
    # фото, аллергены, КБЖУ редактируются персоналом в iikoWeb
    async def get_menu(self) -> schemas.Menu: ...

    # Стоп-лист: множество id позиций (обновляется вебхуком StopListUpdate)
    async def get_stop_list(self) -> set[str]: ...

    # Зоны доставки
    async def get_delivery_zones(self) -> list[schemas.DeliveryZone]: ...

    # Заказы: возвращают id заказа в iiko
    async def create_delivery_order(self, request: schemas.CheckoutRequest) -> str: ...
    async def create_pickup_order(self, request: schemas.CheckoutRequest) -> str: ...
    async def create_table_order(self, request: schemas.CheckoutRequest) -> str: ...

    # Загрузка кухни для расчёта ETA самовывоза: количество активных заказов
    # (включая заказы агрегаторов — они тоже проходят через iiko)
    async def get_active_order_count(self) -> int: ...

    # Бронь: схема залов со столами и создание резерва
    async def get_sections(self) -> list[schemas.Section]: ...
    async def create_reserve(self, request: schemas.ReserveRequest) -> schemas.ReserveView: ...
