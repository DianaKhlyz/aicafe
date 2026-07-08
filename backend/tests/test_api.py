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
    assert "Завтраки" in names
    # В мок-данных «Том-ям» в стоп-листе — флаг должен быть проставлен
    items = {i["id"]: i for c in menu["categories"] for i in c["items"]}
    assert items["dish-tomyum"]["in_stop_list"] is True
    assert items["dish-syrniki"]["in_stop_list"] is False


def test_checkout_pickup_returns_eta(client):
    response = client.post(
        "/api/orders",
        json={"mode": "pickup", "items": [{"item_id": "dish-syrniki", "quantity": 2}]},
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
        json={"mode": "pickup", "items": [{"item_id": "dish-tomyum", "quantity": 1}]},
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


def test_booking_sections(client):
    response = client.get("/api/booking/sections")
    assert response.status_code == 200
    sections = response.json()
    assert len(sections) == 2
    assert any(t["occupied"] for s in sections for t in s["tables"])
