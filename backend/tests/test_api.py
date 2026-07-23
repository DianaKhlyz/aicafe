import pytest
from fastapi.testclient import TestClient

from app.main import app


@pytest.fixture
def client():
    with TestClient(app) as test_client:
        yield test_client


def test_menu_returns_categories_with_stop_list(client):
    response = client.get("/api/menu")
    assert response.status_code == 200
    menu = response.json()
    names = [c["name"] for c in menu["categories"]]
    assert "Из смокера" in names
    # В мок-данных IPA в стоп-листе — флаг должен быть проставлен
    items = {i["id"]: i for c in menu["categories"] for i in c["items"]}
    assert items["dish-ipa"]["in_stop_list"] is True
    assert items["dish-brisket"]["in_stop_list"] is False


def test_eta_preview(client):
    response = client.get("/api/orders/eta")
    assert response.status_code == 200
    assert response.json()["eta_minutes"] > 0


def test_checkout_requires_phone_for_pickup(client):
    response = client.post(
        "/api/orders",
        json={"mode": "pickup", "items": [{"item_id": "dish-brisket", "quantity": 1}]},
    )
    assert response.status_code == 422


def test_checkout_pickup_returns_eta(client):
    response = client.post(
        "/api/orders",
        json={
            "mode": "pickup",
            "phone": "+79990001122",
            "items": [{"item_id": "dish-brisket", "quantity": 2}],
        },
    )
    assert response.status_code == 200
    order = response.json()
    assert order["eta_minutes"] is not None
    assert order["payment_status"] == "paid"  # заглушка эквайринга

    # Заказ доступен по id (трекер)
    tracker = client.get(f"/api/orders/{order['id']}")
    assert tracker.status_code == 200


def test_checkout_rejects_stop_listed_item(client):
    response = client.post(
        "/api/orders",
        json={
            "mode": "pickup",
            "phone": "+79990001122",
            "items": [{"item_id": "dish-ipa", "quantity": 1}],
        },
    )
    assert response.status_code == 409


def test_check_address_in_zone(client):
    # Точка внутри мок-зоны «Центр»
    response = client.post("/api/delivery/check-address", json={"lat": 55.755, "lon": 37.61})
    assert response.status_code == 200
    result = response.json()
    assert result["in_zone"] is True
    assert result["zone"]["name"] == "Центр"

    # Точка вне всех зон
    response = client.post("/api/delivery/check-address", json={"lat": 50.0, "lon": 30.0})
    assert response.json()["in_zone"] is False


def test_auth_and_order_history_flow(client):
    phone = "+79995556677"

    # До входа история недоступна
    assert client.get("/api/account/orders").status_code == 401

    # Неверный код отклоняется
    client.post("/api/auth/request-code", json={"phone": phone})
    bad = client.post("/api/auth/verify", json={"phone": phone, "code": "1234"})
    assert bad.status_code == 401

    # Дев-код 0000 создаёт пользователя и сессию (cookie)
    ok = client.post("/api/auth/verify", json={"phone": phone, "code": "0000"})
    assert ok.status_code == 200
    assert client.get("/api/auth/me").json()["phone"] == phone

    # Заказ с этим телефоном попадает в историю со снапшотом состава
    client.post(
        "/api/orders",
        json={
            "mode": "pickup",
            "phone": phone,
            "items": [{"item_id": "dish-brisket", "quantity": 2}],
        },
    )
    history = client.get("/api/account/orders").json()
    assert len(history) == 1
    assert history[0]["amount"] == 1380
    assert history[0]["items"] == [{"item_id": "dish-brisket", "quantity": 2}]

    # Выход завершает сессию
    client.post("/api/auth/logout")
    assert client.get("/api/auth/me").status_code == 401


def test_suggest_addresses(client):
    response = client.get("/api/delivery/suggest", params={"query": "Тверская"})
    assert response.status_code == 200
    suggestions = response.json()
    assert len(suggestions) == 2
    assert all("lat" in s and "lon" in s for s in suggestions)

    # Мок-адрес из зоны «Центр» действительно проходит проверку зоны
    inside = next(s for s in suggestions if s["value"] == "ул Тверская, д 7")
    check = client.post(
        "/api/delivery/check-address", json={"lat": inside["lat"], "lon": inside["lon"]}
    ).json()
    assert check["in_zone"] is True

    too_short = client.get("/api/delivery/suggest", params={"query": "ул"})
    assert too_short.status_code == 422


def test_booking_sections(client):
    response = client.get("/api/booking/sections")
    assert response.status_code == 200
    sections = response.json()
    assert len(sections) == 2
    assert any(t["occupied"] for s in sections for t in s["tables"])


def test_reserve_marks_table_occupied(client):
    response = client.post(
        "/api/booking/reserve",
        json={
            "table_id": "t1",
            "phone": "+79990001122",
            "guests": 2,
            "time": "2026-07-09T18:00:00Z",
        },
    )
    assert response.status_code == 200
    assert response.json()["status"] == "confirmed"

    sections = client.get("/api/booking/sections").json()
    table = next(t for s in sections for t in s["tables"] if t["id"] == "t1")
    assert table["occupied"] is True


def test_table_cart_shared_flow(client):
    # Два гостя наполняют одну корзину стола
    client.post(
        "/api/tables/A2/cart",
        json={"item_id": "dish-brisket", "quantity": 2, "guest": "Аня"},
    )
    response = client.post(
        "/api/tables/A2/cart",
        json={"item_id": "dish-lager", "quantity": 1, "guest": "Борис"},
    )
    cart = response.json()
    assert len(cart["lines"]) == 2
    assert cart["total"] == 690 * 2 + 320
    assert {line["guest"] for line in cart["lines"]} == {"Аня", "Борис"}

    # Чекаут стола берёт серверную корзину и очищает её
    order = client.post(
        "/api/orders",
        json={"mode": "table", "table_code": "A2", "items": []},
    )
    assert order.status_code == 200

    cleared = client.get("/api/tables/A2/cart").json()
    assert cleared["lines"] == []


def test_table_checkout_with_empty_table_cart_rejected(client):
    response = client.post(
        "/api/orders",
        json={"mode": "table", "table_code": "A9", "items": []},
    )
    assert response.status_code == 422


def test_reserve_validates_guests_and_phone(client):
    bad_guests = client.post(
        "/api/booking/reserve",
        json={
            "table_id": "t2",
            "phone": "+79990001122",
            "guests": 0,
            "time": "2026-07-09T18:00:00Z",
        },
    )
    assert bad_guests.status_code == 422

    bad_phone = client.post(
        "/api/booking/reserve",
        json={"table_id": "t2", "phone": "123", "guests": 2, "time": "2026-07-09T18:00:00Z"},
    )
    assert bad_phone.status_code == 422
