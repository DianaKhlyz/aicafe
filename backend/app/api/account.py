import json

from fastapi import APIRouter, HTTPException, Request
from sqlalchemy import select

from app import schemas
from app.db import session_factory
from app.models import OrderLink
from app.services.sessions import current_user

router = APIRouter(prefix="/api/account", tags=["account"])

HISTORY_LIMIT = 20


@router.get("/orders")
async def order_history(request: Request) -> list[schemas.AccountOrder]:
    """История заказов гостя (по телефону) со снапшотами состава.

    Позже дополним историей из iiko (deliveries/by_delivery_date_and_phone) —
    там видны и заказы, сделанные не через сайт.
    """
    user = await current_user(request)
    if user is None:
        raise HTTPException(status_code=401)
    async with session_factory() as session:
        orders = (
            (
                await session.execute(
                    select(OrderLink)
                    .where(OrderLink.phone == user.phone)
                    .order_by(OrderLink.created_at.desc())
                    .limit(HISTORY_LIMIT)
                )
            )
            .scalars()
            .all()
        )
    return [
        schemas.AccountOrder(
            id=order.id,
            mode=schemas.OrderMode(order.mode),
            status=schemas.OrderStatus(order.status),
            payment_status=order.payment_status,
            amount=order.amount,
            items=[schemas.CartItem(**line) for line in json.loads(order.items_json)],
            created_at=order.created_at,
        )
        for order in orders
    ]
