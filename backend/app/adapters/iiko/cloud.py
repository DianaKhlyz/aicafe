"""Боевой клиент iikoCloud API (api-ru.iiko.services).

Написан по официальной OpenAPI-схеме iiko Transport (см.
docs/iiko-api-notes.md). Формы запросов/ответов — фактические; пункты,
где на песочнице нужно сверить поведение, помечены «песочница:».

Включается настройкой AICAFE_IIKO_MOCK=false + apiLogin.
"""

import asyncio
import logging
from datetime import UTC, datetime, timedelta
from typing import Any
from zoneinfo import ZoneInfo

import httpx

from app import schemas
from app.config import settings

logger = logging.getLogger(__name__)

BASE_URL = "https://api-ru.iiko.services"

# Статусы «заказ в работе на кухне» для расчёта загрузки (ETA самовывоза)
IN_PROGRESS_STATUSES = ["Unconfirmed", "WaitCooking", "ReadyForCooking", "CookingStarted"]

RESERVE_DURATION_MINUTES = 120  # стандартная длительность брони с сайта
WORKLOAD_WINDOW_HOURS = 2  # окно «стол занят сейчас» для карты зала


class IikoApiError(RuntimeError):
    def __init__(self, path: str, status_code: int, detail: str) -> None:
        super().__init__(f"iiko {path} -> HTTP {status_code}: {detail}")
        self.path = path
        self.status_code = status_code


def _local(dt: datetime) -> str:
    """iiko ждёт локальное время терминала без таймзоны: yyyy-MM-dd HH:mm:ss.fff"""
    if dt.tzinfo is not None:
        dt = dt.astimezone(ZoneInfo(settings.iiko_terminal_timezone)).replace(tzinfo=None)
    return dt.strftime("%Y-%m-%d %H:%M:%S.") + f"{dt.microsecond // 1000:03d}"


def _nutrition(raw: dict[str, Any] | None) -> schemas.Nutrition | None:
    """Поля NutritionInfoDto в схеме не детализированы — маппим осторожно.

    песочница: зафиксировать точные имена полей КБЖУ.
    """
    if not raw:
        return None
    kcal = raw.get("energy") or raw.get("kcal") or raw.get("energyValue")
    if kcal is None:
        return None
    return schemas.Nutrition(
        kcal=float(kcal),
        proteins=float(raw.get("proteins") or 0),
        fats=float(raw.get("fats") or 0),
        carbs=float(raw.get("carbs") or raw.get("carbohydrates") or 0),
    )


def _default_size(item: dict[str, Any]) -> dict[str, Any]:
    sizes = item.get("itemSizes") or []
    for size in sizes:
        if size.get("isDefault"):
            return size
    return sizes[0] if sizes else {}


class CloudIikoClient:
    def __init__(self, transport: httpx.AsyncBaseTransport | None = None) -> None:
        self._http = httpx.AsyncClient(base_url=BASE_URL, timeout=15, transport=transport)
        self._token: str | None = None
        self._token_lock = asyncio.Lock()
        self._terminal_group_id: str | None = settings.iiko_terminal_group_id or None
        self._external_menu_id: str | None = settings.iiko_external_menu_id or None
        # код стола (номер на QR) -> uuid стола в iiko; наполняется get_sections
        self._table_ids: dict[str, str] = {}

    # --- Транспорт -----------------------------------------------------------

    async def _ensure_token(self) -> str:
        async with self._token_lock:
            if self._token is None:
                response = await self._http.post(
                    "/api/1/access_token", json={"apiLogin": settings.iiko_api_login}
                )
                if response.status_code >= 400:
                    raise IikoApiError("/api/1/access_token", response.status_code, response.text)
                self._token = response.json()["token"]
            return self._token

    async def _request(
        self, path: str, payload: dict[str, Any], *, retry_auth: bool = True
    ) -> dict[str, Any]:
        token = await self._ensure_token()
        response = await self._http.post(
            path, json=payload, headers={"Authorization": f"Bearer {token}"}
        )
        if response.status_code == 401 and retry_auth:
            self._token = None  # токен живёт ~час — обновляем и повторяем один раз
            return await self._request(path, payload, retry_auth=False)
        if response.status_code >= 400:
            raise IikoApiError(path, response.status_code, response.text[:500])
        return response.json()

    def _org(self) -> str:
        if not settings.iiko_organization_ids:
            raise RuntimeError("AICAFE_IIKO_ORGANIZATION_IDS не заполнен")
        return settings.iiko_organization_ids[0]

    async def _terminal_group(self) -> str:
        if self._terminal_group_id is None:
            data = await self._request(
                "/api/1/terminal_groups", {"organizationIds": [self._org()]}
            )
            groups = data["terminalGroups"][0]["items"]
            self._terminal_group_id = groups[0]["id"]
        return self._terminal_group_id

    # --- Меню и стоп-листы -----------------------------------------------------

    async def _menu_id(self) -> str:
        if self._external_menu_id is None:
            data = await self._request("/api/2/menu", {})
            menus = data.get("externalMenus") or []
            if not menus:
                raise RuntimeError("В iikoWeb не настроено ни одного внешнего меню")
            self._external_menu_id = str(menus[0]["id"])
        return self._external_menu_id

    async def get_menu(self) -> schemas.Menu:
        data = await self._request(
            "/api/2/menu/by_id",
            {"externalMenuId": await self._menu_id(), "organizationIds": [self._org()]},
        )
        categories = []
        for raw_category in data.get("itemCategories") or []:
            items = []
            for raw_item in raw_category.get("items") or []:
                size = _default_size(raw_item)
                prices = size.get("prices") or []
                items.append(
                    schemas.MenuItem(
                        id=str(raw_item["itemId"]),
                        name=raw_item.get("name") or "",
                        description=raw_item.get("description") or "",
                        price=float(prices[0]["price"]) if prices else 0.0,
                        image_url=size.get("buttonImageUrl"),
                        allergens=[
                            group.get("name", "")
                            for group in raw_item.get("allergenGroups") or []
                        ],
                        tags=[tag["name"] for tag in raw_item.get("tags") or [] if tag.get("name")],
                        nutrition=_nutrition(size.get("nutritionPerHundredGrams")),
                    )
                )
            categories.append(
                schemas.MenuCategory(
                    id=str(raw_category.get("id")),
                    name=raw_category.get("name") or "",
                    items=items,
                )
            )
        return schemas.Menu(categories=categories, updated_at=datetime.now(UTC))

    async def get_stop_list(self) -> set[str]:
        data = await self._request("/api/1/stop_lists", {"organizationIds": [self._org()]})
        stopped: set[str] = set()
        for org_lists in data.get("terminalGroupStopLists") or []:
            for terminal_group in org_lists.get("items") or []:
                for item in terminal_group.get("items") or []:
                    # balance > 0 = ограниченный остаток, блюдо ещё доступно
                    if float(item.get("balance", 0)) <= 0:
                        stopped.add(str(item["productId"]))
        return stopped

    # --- Зоны доставки ----------------------------------------------------------

    async def get_delivery_zones(self) -> list[schemas.DeliveryZone]:
        data = await self._request(
            "/api/1/delivery_restrictions", {"organizationIds": [self._org()]}
        )
        # песочница: точное место minSum в ответе (restrictions привязаны к зонам)
        zones = []
        for raw_zone in data.get("deliveryZones") or []:
            coordinates = raw_zone.get("coordinates") or []
            zones.append(
                schemas.DeliveryZone(
                    name=raw_zone.get("name") or "Зона",
                    polygon=[[c["latitude"], c["longitude"]] for c in coordinates],
                    min_order=float(raw_zone.get("minSum") or 0),
                    delivery_price=float(raw_zone.get("deliveryPrice") or 0),
                )
            )
        return zones

    # --- Заказы ------------------------------------------------------------------

    def _order_items(self, request: schemas.CheckoutRequest) -> list[dict[str, Any]]:
        return [
            {"type": "Product", "productId": line.item_id, "amount": line.quantity}
            for line in request.items
        ]

    async def _create_delivery(
        self, request: schemas.CheckoutRequest, service_type: str
    ) -> str:
        order: dict[str, Any] = {
            "phone": request.phone,
            "orderServiceType": service_type,
            "comment": request.comment or None,
            "items": self._order_items(request),
        }
        if request.desired_time is not None:
            order["completeBefore"] = _local(request.desired_time)
        if service_type == "DeliveryByCourier":
            # песочница: структурированный адрес (улица/дом из разбора DaData);
            # пока адрес одной строкой в комментарии точки доставки
            order["deliveryPoint"] = {"comment": request.address}
        data = await self._request(
            "/api/1/deliveries/create",
            {
                "organizationId": self._org(),
                "terminalGroupId": await self._terminal_group(),
                "order": order,
            },
        )
        return str(data["orderInfo"]["id"])

    async def create_delivery_order(self, request: schemas.CheckoutRequest) -> str:
        return await self._create_delivery(request, "DeliveryByCourier")

    async def create_pickup_order(self, request: schemas.CheckoutRequest) -> str:
        return await self._create_delivery(request, "DeliveryByClient")

    async def create_table_order(self, request: schemas.CheckoutRequest) -> str:
        table_id = await self._table_uuid(request.table_code or "")
        order: dict[str, Any] = {
            "tableIds": [table_id],
            "items": self._order_items(request),
        }
        if request.phone:
            order["phone"] = request.phone
        if request.comment:
            order["comment"] = request.comment
        data = await self._request(
            "/api/1/order/create",
            {
                "organizationId": self._org(),
                "terminalGroupId": await self._terminal_group(),
                "order": order,
            },
        )
        return str(data["orderInfo"]["id"])

    async def get_active_order_count(self) -> int:
        data = await self._request(
            "/api/1/deliveries/by_delivery_date_and_status",
            {
                "organizationIds": [self._org()],
                "deliveryDateFrom": _local(datetime.now(UTC) - timedelta(hours=6)),
                "statuses": IN_PROGRESS_STATUSES,
            },
        )
        return sum(
            len(by_org.get("orders") or [])
            for by_org in data.get("ordersByOrganizations") or []
        )

    # --- Бронь и столы -------------------------------------------------------------

    async def get_sections(self) -> list[schemas.Section]:
        data = await self._request(
            "/api/1/reserve/available_restaurant_sections",
            {"terminalGroupIds": [await self._terminal_group()], "returnSchema": True},
        )
        sections: list[schemas.Section] = []
        for raw_section in data.get("restaurantSections") or []:
            schema_data = raw_section.get("schema") or {}
            width = float(schema_data.get("width") or 0) or 1.0
            height = float(schema_data.get("height") or 0) or 1.0
            positions = {
                element["tableId"]: element
                for element in schema_data.get("tableElements") or []
            }
            tables = []
            for raw_table in raw_section.get("tables") or []:
                if raw_table.get("isDeleted"):
                    continue
                code = str(raw_table["number"])
                self._table_ids[code] = raw_table["id"]
                position = positions.get(raw_table["id"])
                # центр стола в нормированных координатах 0..1 (наш рендер)
                if position:
                    x = (position["x"] + position.get("width", 0) / 2) / width
                    y = (position["y"] + position.get("height", 0) / 2) / height
                else:
                    x = y = 0.5
                tables.append(
                    schemas.Table(
                        id=str(raw_table["id"]),
                        code=code,
                        number=int(raw_table["number"]),
                        seats=int(raw_table.get("seatingCapacity") or 2),
                        x=round(min(max(x, 0.0), 1.0), 4),
                        y=round(min(max(y, 0.0), 1.0), 4),
                    )
                )
            sections.append(
                schemas.Section(
                    id=str(raw_section["id"]),
                    name=raw_section.get("name") or "Зал",
                    tables=tables,
                )
            )
        await self._mark_occupied(sections)
        return sections

    async def _mark_occupied(self, sections: list[schemas.Section]) -> None:
        """Занятость «сейчас»: резервы, попадающие в ближайшее окно."""
        if not sections:
            return
        now = datetime.now(UTC)
        data = await self._request(
            "/api/1/reserve/restaurant_sections_workload",
            {
                "restaurantSectionIds": [section.id for section in sections],
                "dateFrom": _local(now),
                "dateTo": _local(now + timedelta(hours=WORKLOAD_WINDOW_HOURS)),
            },
        )
        busy = {
            str(table_id)
            for reserve in data.get("reserves") or []
            for table_id in reserve.get("tableIds") or []
        }
        for section in sections:
            for table in section.tables:
                if table.id in busy:
                    table.occupied = True

    async def _table_uuid(self, code: str) -> str:
        if code not in self._table_ids:
            await self.get_sections()  # обновляет карту код -> uuid
        if code not in self._table_ids:
            raise IikoApiError("/api/1/order/create", 422, f"Неизвестный стол: {code}")
        return self._table_ids[code]

    async def create_reserve(self, request: schemas.ReserveRequest) -> schemas.ReserveView:
        table_id = request.table_id
        data = await self._request(
            "/api/1/reserve/create",
            {
                "organizationId": self._org(),
                "terminalGroupId": await self._terminal_group(),
                "customer": {"type": "regular", "name": "Гость сайта"},
                "phone": request.phone,
                "guests": {"count": request.guests},
                "durationInMinutes": RESERVE_DURATION_MINUTES,
                "shouldRemind": True,
                "tableIds": [table_id],
                "estimatedStartTime": _local(request.time),
            },
        )
        reserve_info = data.get("reserveInfo") or {}
        return schemas.ReserveView(
            id=str(reserve_info.get("id") or ""),
            table_id=table_id,
            time=request.time,
            status="confirmed" if not reserve_info.get("errorInfo") else "error",
        )

    # --- Вебхуки --------------------------------------------------------------------

    async def ensure_webhooks(self) -> None:
        """Самонастройка вебхуков при старте (webhooks/update_settings).

        Без фильтра iiko шлёт все типы событий — нам нужны StopListUpdate,
        DeliveryOrderUpdate, ReserveUpdate; лишние отбрасывает наш обработчик.
        песочница: сузить фильтром webHooksFilter после сверки формата.
        """
        if not settings.iiko_webhook_url:
            logger.warning("AICAFE_IIKO_WEBHOOK_URL пуст — вебхуки iiko не настроены")
            return
        await self._request(
            "/api/1/webhooks/update_settings",
            {
                "organizationId": self._org(),
                "webHooksUri": settings.iiko_webhook_url,
                "authToken": settings.iiko_webhook_auth_token or None,
            },
        )
        logger.info("Вебхуки iiko настроены на %s", settings.iiko_webhook_url)
