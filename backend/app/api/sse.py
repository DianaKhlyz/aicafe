"""SSE-стрим для клиентов: стоп-листы, статусы заказов, занятость столов.

Один endpoint, события маркируются каналом; фронт фильтрует по channel.
Позже добавим канал общей корзины стола (групповой заказ).
"""

import asyncio
import json

from fastapi import APIRouter, Request
from sse_starlette.sse import EventSourceResponse

from app.events import bus

router = APIRouter(prefix="/api", tags=["events"])

KEEPALIVE_SECONDS = 25


@router.get("/events")
async def events(request: Request) -> EventSourceResponse:
    queue = bus.subscribe()

    async def stream():
        try:
            while not await request.is_disconnected():
                try:
                    event = await asyncio.wait_for(queue.get(), timeout=KEEPALIVE_SECONDS)
                except TimeoutError:
                    yield {"comment": "keepalive"}
                    continue
                yield {"event": event["channel"], "data": json.dumps(event["data"])}
        finally:
            bus.unsubscribe(queue)

    return EventSourceResponse(stream())
