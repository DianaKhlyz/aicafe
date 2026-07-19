import pytest
from fastapi.testclient import TestClient

from app.config import settings
from app.main import app


@pytest.fixture
def client():
    with TestClient(app) as test_client:
        yield test_client


def test_stop_toggle_reflected_in_menu(client):
    stopped = client.post(
        "/api/demo/stoplist", json={"item_id": "dish-syrniki", "stopped": True}
    ).json()
    assert "dish-syrniki" in stopped

    menu = client.get("/api/menu").json()
    items = {i["id"]: i for c in menu["categories"] for i in c["items"]}
    assert items["dish-syrniki"]["in_stop_list"] is True

    client.post("/api/demo/stoplist", json={"item_id": "dish-syrniki", "stopped": False})
    menu = client.get("/api/menu").json()
    items = {i["id"]: i for c in menu["categories"] for i in c["items"]}
    assert items["dish-syrniki"]["in_stop_list"] is False


def test_order_advances_through_chain(client):
    order = client.post(
        "/api/orders",
        json={
            "mode": "pickup",
            "phone": "+79991112233",
            "items": [{"item_id": "dish-lemonade", "quantity": 1}],
        },
    ).json()

    listed = client.get("/api/demo/orders").json()
    assert any(o["id"] == order["id"] for o in listed)

    assert client.post(f"/api/demo/orders/{order['id']}/next-status").json()["status"] == "cooking"
    assert client.post(f"/api/demo/orders/{order['id']}/next-status").json()["status"] == "ready"
    assert client.post(f"/api/demo/orders/{order['id']}/next-status").json()["status"] == "closed"
    # Завершённый заказ дальше не двигается
    assert client.post(f"/api/demo/orders/{order['id']}/next-status").status_code == 409


def test_telegram_test_reports_unconfigured(client):
    result = client.post("/api/demo/telegram-test").json()
    assert result["enabled"] is False
    assert result["ok"] is False


def test_panel_hidden_outside_mock_mode(client):
    settings.iiko_mock = False
    try:
        assert client.get("/api/demo/status").status_code == 404
        assert client.get("/api/demo/orders").status_code == 404
        assert client.post("/api/demo/telegram-test").status_code == 404
    finally:
        settings.iiko_mock = True
