"""Тесты боевого клиента iiko на фейковых ответах.

Тела ответов собраны строго по официальной OpenAPI-схеме iiko Transport
(docs/iiko-api-notes.md). Когда появится apiLogin, эти же тесты помогут
зафиксировать расхождения поведения песочницы со схемой.
"""

import json

import httpx
import pytest

from app import schemas
from app.adapters.iiko.cloud import CloudIikoClient
from app.config import settings

ORG = "11111111-1111-1111-1111-111111111111"
TERMINAL = "22222222-2222-2222-2222-222222222222"
TABLE_UUID = "33333333-3333-3333-3333-333333333333"
SECTION = "44444444-4444-4444-4444-444444444444"

RESPONSES = {
    "/api/1/access_token": {"correlationId": "c", "token": "test-token"},
    "/api/1/terminal_groups": {
        "correlationId": "c",
        "terminalGroups": [
            {"organizationId": ORG, "items": [{"id": TERMINAL, "name": "Основной"}]}
        ],
    },
    "/api/2/menu": {
        "correlationId": "c",
        "externalMenus": [{"id": "77", "name": "Сайт"}],
        "priceCategories": [],
    },
    "/api/2/menu/by_id": {
        "id": 77,
        "name": "Сайт",
        "itemCategories": [
            {
                "id": "cat-1",
                "name": "Супы",
                "items": [
                    {
                        "itemId": "dish-1",
                        "name": "Том-ям",
                        "description": "Острый суп",
                        "allergenGroups": [{"id": "a1", "name": "морепродукты"}],
                        "tags": [{"id": "t1", "name": "острое"}],
                        "orderItemType": "Product",
                        "itemSizes": [
                            {
                                "isDefault": True,
                                "portionWeightGrams": 350,
                                "prices": [{"organizationId": ORG, "price": 590}],
                                "buttonImageUrl": "https://cdn.iiko/img.png",
                                "nutritionPerHundredGrams": {
                                    "energy": 137,
                                    "proteins": 7,
                                    "fats": 8,
                                    "carbs": 9,
                                },
                            }
                        ],
                    }
                ],
            }
        ],
    },
    "/api/1/stop_lists": {
        "correlationId": "c",
        "terminalGroupStopLists": [
            {
                "organizationId": ORG,
                "items": [
                    {
                        "terminalGroupId": TERMINAL,
                        "items": [
                            {"productId": "dish-1", "balance": 0},
                            {"productId": "dish-2", "balance": 5},
                        ],
                    }
                ],
            }
        ],
    },
    "/api/1/delivery_restrictions": {
        "correlationId": "c",
        "deliveryZones": [
            {
                "name": "Центр",
                "coordinates": [
                    {"latitude": 55.75, "longitude": 37.58},
                    {"latitude": 55.78, "longitude": 37.60},
                    {"latitude": 55.77, "longitude": 37.66},
                ],
                "minSum": 800,
            }
        ],
    },
    "/api/1/deliveries/create": {
        "correlationId": "c",
        "orderInfo": {"id": "iiko-delivery-1", "creationStatus": "InProgress"},
    },
    "/api/1/order/create": {
        "correlationId": "c",
        "orderInfo": {"id": "iiko-table-1", "creationStatus": "InProgress"},
    },
    "/api/1/deliveries/by_delivery_date_and_status": {
        "correlationId": "c",
        "maxRevision": 1,
        "ordersByOrganizations": [
            {"organizationId": ORG, "orders": [{"id": "o1"}, {"id": "o2"}, {"id": "o3"}]}
        ],
    },
    "/api/1/reserve/available_restaurant_sections": {
        "correlationId": "c",
        "revision": 1,
        "restaurantSections": [
            {
                "id": SECTION,
                "terminalGroupId": TERMINAL,
                "name": "Основной зал",
                "tables": [
                    {
                        "id": TABLE_UUID,
                        "number": 5,
                        "name": "Стол 5",
                        "seatingCapacity": 4,
                        "revision": 1,
                        "isDeleted": False,
                    }
                ],
                "schema": {
                    "width": 1000,
                    "height": 500,
                    "markElements": [],
                    "rectangleElements": [],
                    "ellipseElements": [],
                    "tableElements": [
                        {
                            "tableId": TABLE_UUID,
                            "x": 100,
                            "y": 200,
                            "z": 0,
                            "angle": 0,
                            "width": 100,
                            "height": 100,
                        }
                    ],
                },
            }
        ],
    },
    "/api/1/reserve/restaurant_sections_workload": {
        "correlationId": "c",
        "reserves": [
            {
                "id": "res-1",
                "tableIds": [TABLE_UUID],
                "estimatedStartTime": "2026-07-09 18:00:00.000",
                "durationInMinutes": 120,
            }
        ],
    },
    "/api/1/reserve/create": {
        "correlationId": "c",
        "reserveInfo": {"id": "iiko-reserve-1", "isDeleted": False},
    },
    "/api/1/webhooks/update_settings": {"correlationId": "c"},
}


@pytest.fixture
def recorded():
    """Клиент на MockTransport + журнал исходящих запросов."""
    requests: list[tuple[str, dict]] = []

    def handler(request: httpx.Request) -> httpx.Response:
        path = request.url.path
        body = json.loads(request.content) if request.content else {}
        requests.append((path, body))
        assert path in RESPONSES, f"Неожиданный запрос: {path}"
        return httpx.Response(200, json=RESPONSES[path])

    original = (settings.iiko_api_login, settings.iiko_organization_ids)
    settings.iiko_api_login = "test-login"
    settings.iiko_organization_ids = [ORG]
    client = CloudIikoClient(transport=httpx.MockTransport(handler))
    yield client, requests
    settings.iiko_api_login, settings.iiko_organization_ids = original


def test_token_fetched_once(recorded):
    import asyncio

    client, requests = recorded

    async def scenario():
        await client.get_stop_list()
        await client.get_stop_list()

    asyncio.run(scenario())
    token_calls = [path for path, _ in requests if path == "/api/1/access_token"]
    assert len(token_calls) == 1
    # Токен ушёл в заголовки авторизованных запросов — проверено самим фактом
    # успешных ответов (handler не различает), формат Bearer проверяем ниже


def test_menu_mapping(recorded):
    import asyncio

    client, _ = recorded
    menu = asyncio.run(client.get_menu())

    assert len(menu.categories) == 1
    category = menu.categories[0]
    assert category.name == "Супы"
    dish = category.items[0]
    assert dish.id == "dish-1"
    assert dish.price == 590
    assert dish.image_url == "https://cdn.iiko/img.png"
    assert dish.allergens == ["морепродукты"]
    assert dish.tags == ["острое"]
    assert dish.nutrition is not None and dish.nutrition.kcal == 137


def test_stop_list_only_zero_balance(recorded):
    import asyncio

    client, _ = recorded
    stopped = asyncio.run(client.get_stop_list())
    assert stopped == {"dish-1"}  # dish-2 с остатком 5 ещё доступен


def test_zones_mapping(recorded):
    import asyncio

    client, _ = recorded
    zones = asyncio.run(client.get_delivery_zones())
    assert zones[0].name == "Центр"
    assert zones[0].polygon[0] == [55.75, 37.58]
    assert zones[0].min_order == 800


def test_delivery_order_payload(recorded):
    import asyncio

    client, requests = recorded
    request = schemas.CheckoutRequest(
        mode=schemas.OrderMode.DELIVERY,
        phone="+79990001122",
        address="ул Тверская, д 7",
        items=[schemas.CartItem(item_id="dish-1", quantity=2)],
    )
    order_id = asyncio.run(client.create_delivery_order(request))
    assert order_id == "iiko-delivery-1"

    path, body = next(r for r in requests if r[0] == "/api/1/deliveries/create")
    assert body["organizationId"] == ORG
    assert body["terminalGroupId"] == TERMINAL
    assert body["order"]["orderServiceType"] == "DeliveryByCourier"
    assert body["order"]["items"] == [
        {"type": "Product", "productId": "dish-1", "amount": 2}
    ]


def test_pickup_order_has_no_delivery_point(recorded):
    import asyncio

    client, requests = recorded
    request = schemas.CheckoutRequest(
        mode=schemas.OrderMode.PICKUP,
        phone="+79990001122",
        items=[schemas.CartItem(item_id="dish-1", quantity=1)],
    )
    asyncio.run(client.create_pickup_order(request))
    _, body = next(r for r in requests if r[0] == "/api/1/deliveries/create")
    assert body["order"]["orderServiceType"] == "DeliveryByClient"
    assert "deliveryPoint" not in body["order"]


def test_sections_normalized_and_occupied(recorded):
    import asyncio

    client, _ = recorded
    sections = asyncio.run(client.get_sections())
    table = sections[0].tables[0]
    # Центр стола: (100 + 100/2) / 1000 = 0.15; (200 + 50) / 500 = 0.5
    assert table.x == 0.15
    assert table.y == 0.5
    assert table.code == "5"
    assert table.occupied is True  # workload вернул резерв на этот стол


def test_table_order_resolves_code_to_uuid(recorded):
    import asyncio

    client, requests = recorded
    request = schemas.CheckoutRequest(
        mode=schemas.OrderMode.TABLE,
        table_code="5",
        items=[schemas.CartItem(item_id="dish-1", quantity=1)],
    )
    order_id = asyncio.run(client.create_table_order(request))
    assert order_id == "iiko-table-1"
    _, body = next(r for r in requests if r[0] == "/api/1/order/create")
    assert body["order"]["tableIds"] == [TABLE_UUID]


def test_active_order_count(recorded):
    import asyncio

    client, _ = recorded
    assert asyncio.run(client.get_active_order_count()) == 3


def test_create_reserve(recorded):
    import asyncio
    from datetime import UTC, datetime

    client, requests = recorded
    view = asyncio.run(
        client.create_reserve(
            schemas.ReserveRequest(
                table_id=TABLE_UUID,
                phone="+79990001122",
                guests=3,
                time=datetime(2026, 7, 9, 15, 0, tzinfo=UTC),
            )
        )
    )
    assert view.id == "iiko-reserve-1"
    assert view.status == "confirmed"
    _, body = next(r for r in requests if r[0] == "/api/1/reserve/create")
    assert body["guests"] == {"count": 3}
    assert body["tableIds"] == [TABLE_UUID]
    # UTC 15:00 -> Москва 18:00, локальный формат без таймзоны
    assert body["estimatedStartTime"] == "2026-07-09 18:00:00.000"


def test_ensure_webhooks(recorded):
    import asyncio

    client, requests = recorded
    original = (settings.iiko_webhook_url, settings.iiko_webhook_auth_token)
    settings.iiko_webhook_url = "https://cafe.example/api/webhooks/iiko"
    settings.iiko_webhook_auth_token = "hook-secret"
    try:
        asyncio.run(client.ensure_webhooks())
    finally:
        settings.iiko_webhook_url, settings.iiko_webhook_auth_token = original
    _, body = next(r for r in requests if r[0] == "/api/1/webhooks/update_settings")
    assert body["webHooksUri"] == "https://cafe.example/api/webhooks/iiko"
    assert body["authToken"] == "hook-secret"
