"""Приём вебхуков iiko и эквайринга.

iiko шлёт массив событий; нас интересуют StopListUpdate (стоп-листы),
DeliveryOrderUpdate (статусы заказов), ReserveUpdate (занятость столов).
Формат тел уточним на песочнице — здесь каркас маршрутизации.
"""

from typing import Any

from fastapi import APIRouter
from sqlalchemy import select

from app.db import session_factory
from app.events import bus
from app.models import OrderLink
from app.services.menu import menu_service

router = APIRouter(prefix="/api/webhooks", tags=["webhooks"])


@router.post("/iiko")
async def iiko_webhook(events: list[dict[str, Any]]) -> dict[str, str]:
    for event in events:
        match event.get("eventType"):
            case "StopListUpdate":
                item_ids = _extract_stop_list_ids(event)
                menu_service.apply_stop_list_update(item_ids)
            case "DeliveryOrderUpdate":
                await _update_order_status(event)
            case "ReserveUpdate":
                bus.publish("reserves", event.get("eventInfo"))
    return {"status": "ok"}


@router.post("/payment")
async def payment_webhook(payload: dict[str, Any]) -> dict[str, str]:
    """Колбэк эквайринга; формат зависит от банка (адаптер), пока каркас."""
    payment_id = payload.get("payment_id")
    if payment_id:
        async with session_factory() as session:
            order = (
                await session.execute(select(OrderLink).where(OrderLink.payment_id == payment_id))
            ).scalar_one_or_none()
            if order is not None:
                order.payment_status = payload.get("status", "paid")
                await session.commit()
                bus.publish("orders", {"id": order.id, "payment_status": order.payment_status})
    return {"status": "ok"}


def _extract_stop_list_ids(event: dict[str, Any]) -> set[str]:
    # Точную структуру eventInfo сверим на песочнице
    info = event.get("eventInfo") or {}
    return {item["productId"] for item in info.get("items", []) if "productId" in item}


async def _update_order_status(event: dict[str, Any]) -> None:
    info = event.get("eventInfo") or {}
    iiko_order_id = info.get("id")
    status = info.get("status")
    if not (iiko_order_id and status):
        return
    async with session_factory() as session:
        order = (
            await session.execute(
                select(OrderLink).where(OrderLink.iiko_order_id == iiko_order_id)
            )
        ).scalar_one_or_none()
        if order is not None:
            order.status = status
            await session.commit()
            bus.publish("orders", {"id": order.id, "status": status})
