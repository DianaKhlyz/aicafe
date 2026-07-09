import json

from fastapi import APIRouter, HTTPException

from app import schemas
from app.adapters.iiko import get_iiko_client
from app.adapters.notify.telegram import staff_notifier
from app.adapters.payments import get_payment_provider
from app.db import session_factory
from app.models import OrderLink
from app.services.eta import pickup_eta_minutes
from app.services.menu import menu_service
from app.services.table_cart import table_cart_service

router = APIRouter(prefix="/api/orders", tags=["orders"])

MODE_LABELS = {
    schemas.OrderMode.DELIVERY: "доставка",
    schemas.OrderMode.PICKUP: "самовывоз",
    schemas.OrderMode.TABLE: "за столом",
}


# Объявлен раньше GET /{order_id}, чтобы «eta» не захватывался как id заказа
@router.get("/eta")
async def pickup_eta() -> schemas.EtaView:
    """Предпросмотр «ближайшего времени» самовывоза для чекаута."""
    return schemas.EtaView(eta_minutes=await pickup_eta_minutes())


@router.post("")
async def checkout(request: schemas.CheckoutRequest) -> schemas.OrderView:
    """Чекаут: доставка / самовывоз ко времени / за столом.

    Гостевой чекаут — всегда доступен, авторизация не требуется.
    За столом источник состава — общая корзина стола на сервере,
    request.items игнорируется (все гости наполняют одну корзину).
    """
    if request.mode == schemas.OrderMode.TABLE:
        if not request.table_code:
            raise HTTPException(status_code=422, detail="Не указан стол")
        request = request.model_copy(
            update={"items": table_cart_service.items_for_order(request.table_code)}
        )
    if not request.items:
        raise HTTPException(status_code=422, detail="Корзина пуста")
    # Телефон обязателен для доставки/самовывоза (iiko требует его для заказа);
    # за столом — опционален (гость уже на месте)
    if request.mode != schemas.OrderMode.TABLE and not request.phone:
        raise HTTPException(status_code=422, detail="Не указан телефон")
    await _reject_stop_listed(request)

    iiko = get_iiko_client()
    eta: int | None = None
    match request.mode:
        case schemas.OrderMode.DELIVERY:
            if not request.address:
                raise HTTPException(status_code=422, detail="Не указан адрес доставки")
            iiko_order_id = await iiko.create_delivery_order(request)
        case schemas.OrderMode.PICKUP:
            if request.desired_time is None:
                eta = await pickup_eta_minutes()
            iiko_order_id = await iiko.create_pickup_order(request)
        case schemas.OrderMode.TABLE:
            iiko_order_id = await iiko.create_table_order(request)
            table_cart_service.clear(request.table_code or "")

    amount = await _order_amount(request)
    payment = await get_payment_provider().create_payment(iiko_order_id, amount)

    order = OrderLink(
        iiko_order_id=iiko_order_id,
        mode=request.mode.value,
        payment_id=payment.id,
        payment_status=payment.status,
        eta_minutes=eta,
        phone=request.phone,
        items_json=json.dumps([line.model_dump() for line in request.items]),
        amount=amount,
    )
    async with session_factory() as session:
        session.add(order)
        await session.commit()
    await staff_notifier.notify(
        f"Новый заказ с сайта: {MODE_LABELS[request.mode]}, {amount:.0f} ₽"
        + (f", стол {request.table_code}" if request.table_code else "")
    )
    return _to_view(order, payment_url=payment.url)


@router.get("/{order_id}")
async def get_order(order_id: str) -> schemas.OrderView:
    async with session_factory() as session:
        order = await session.get(OrderLink, order_id)
    if order is None:
        raise HTTPException(status_code=404, detail="Заказ не найден")
    return _to_view(order)


async def _reject_stop_listed(request: schemas.CheckoutRequest) -> None:
    menu = await menu_service.get_menu()
    stopped = {i.id for c in menu.categories for i in c.items if i.in_stop_list}
    conflict = [i.item_id for i in request.items if i.item_id in stopped]
    if conflict:
        raise HTTPException(status_code=409, detail={"stop_listed": conflict})


async def _order_amount(request: schemas.CheckoutRequest) -> float:
    menu = await menu_service.get_menu()
    prices = {i.id: i.price for c in menu.categories for i in c.items}
    try:
        return sum(prices[i.item_id] * i.quantity for i in request.items)
    except KeyError as exc:
        raise HTTPException(status_code=422, detail=f"Неизвестная позиция: {exc}") from exc


def _to_view(order: OrderLink, payment_url: str | None = None) -> schemas.OrderView:
    return schemas.OrderView(
        id=order.id,
        mode=schemas.OrderMode(order.mode),
        status=schemas.OrderStatus(order.status),
        payment_status=order.payment_status,
        payment_url=payment_url,
        eta_minutes=order.eta_minutes,
        created_at=order.created_at,
    )
