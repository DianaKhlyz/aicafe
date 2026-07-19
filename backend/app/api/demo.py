"""Демо-пульт: кнопочная имитация событий iiko вместо curl-команд.

Открывается страницей /demo (не в навигации). Работает ТОЛЬКО в мок-режиме
(AICAFE_IIKO_MOCK=true) — в боевом режиме все эндпоинты отвечают 404,
события идут от настоящего iiko.
"""

from fastapi import APIRouter, HTTPException
from sqlalchemy import select

from app import schemas
from app.adapters.notify.telegram import staff_notifier
from app.config import settings
from app.db import session_factory
from app.events import bus
from app.models import OrderLink
from app.services.menu import menu_service

router = APIRouter(prefix="/api/demo", tags=["demo"])

# Цепочки статусов повторяют реальные переходы iiko по типам заказов
STATUS_CHAINS: dict[str, list[str]] = {
    "delivery": ["new", "cooking", "on_the_way", "closed"],
    "pickup": ["new", "cooking", "ready", "closed"],
    "table": ["new", "cooking", "ready", "closed"],
}

RECENT_ORDERS_LIMIT = 10


def _guard() -> None:
    if not settings.iiko_mock:
        raise HTTPException(status_code=404)


@router.get("/status")
async def panel_status() -> schemas.DemoPanelStatus:
    _guard()
    return schemas.DemoPanelStatus(
        enabled=True, telegram_configured=staff_notifier.enabled
    )


@router.post("/stoplist")
async def toggle_stop(body: schemas.StopToggle) -> list[str]:
    """Имитация StopListUpdate: блюдо гаснет/возвращается у всех клиентов."""
    _guard()
    return sorted(menu_service.toggle_stop(body.item_id, body.stopped))


@router.get("/orders")
async def recent_orders() -> list[schemas.DemoOrderInfo]:
    _guard()
    async with session_factory() as session:
        orders = (
            (
                await session.execute(
                    select(OrderLink)
                    .order_by(OrderLink.created_at.desc())
                    .limit(RECENT_ORDERS_LIMIT)
                )
            )
            .scalars()
            .all()
        )
    return [
        schemas.DemoOrderInfo(
            id=order.id,
            mode=schemas.OrderMode(order.mode),
            status=schemas.OrderStatus(order.status),
            amount=order.amount,
            created_at=order.created_at,
        )
        for order in orders
    ]


@router.post("/orders/{order_id}/next-status")
async def advance_order(order_id: str) -> schemas.DemoOrderInfo:
    """Имитация DeliveryOrderUpdate: заказ переходит к следующему шагу,
    открытый трекер обновляется по SSE."""
    _guard()
    async with session_factory() as session:
        order = await session.get(OrderLink, order_id)
        if order is None:
            raise HTTPException(status_code=404, detail="Заказ не найден")
        chain = STATUS_CHAINS[order.mode]
        try:
            current_index = chain.index(order.status)
        except ValueError:
            current_index = 0
        if current_index >= len(chain) - 1:
            raise HTTPException(status_code=409, detail="Заказ уже завершён")
        order.status = chain[current_index + 1]
        await session.commit()
        bus.publish("orders", {"id": order.id, "status": order.status})
        return schemas.DemoOrderInfo(
            id=order.id,
            mode=schemas.OrderMode(order.mode),
            status=schemas.OrderStatus(order.status),
            amount=order.amount,
            created_at=order.created_at,
        )


@router.post("/telegram-test")
async def telegram_test() -> schemas.TelegramTestResult:
    """Пробная отправка в группу персонала с диагностикой ошибок."""
    _guard()
    result = await staff_notifier.send_test()
    return schemas.TelegramTestResult(
        enabled=bool(result["enabled"]), ok=bool(result["ok"]), detail=str(result["detail"])
    )
