import logging
from contextlib import asynccontextmanager
from zoneinfo import ZoneInfo

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.adapters.iiko import get_iiko_client
from app.adapters.iiko.cloud import CloudIikoClient
from app.api import (
    account,
    auth,
    booking,
    delivery,
    demo,
    menu,
    orders,
    sse,
    tables,
    webhooks,
)
from app.config import settings
from app.db import create_tables
from app.services.menu import menu_service
from app.services.staff_bot import staff_bot

logger = logging.getLogger(__name__)

MENU_SYNC_MINUTES = 10


@asynccontextmanager
async def lifespan(app: FastAPI):
    await create_tables()
    # Недоступность iiko не должна ронять сервер: меню догрузится синком
    try:
        await menu_service.refresh()
    except Exception:
        logger.exception("Не удалось загрузить меню при старте")

    if not settings.iiko_mock:
        client = get_iiko_client()
        if isinstance(client, CloudIikoClient):
            try:
                await client.ensure_webhooks()
            except Exception:
                logger.exception("Не удалось настроить вебхуки iiko")

    try:
        await staff_bot.setup_webhook()
    except Exception:
        logger.exception("Не удалось настроить вебхук Telegram-бота")

    scheduler = AsyncIOScheduler(timezone=ZoneInfo(settings.iiko_terminal_timezone))
    if not settings.iiko_mock:
        # Страховочный синк: вебхуки — мгновенные обновления, синк — сверка
        scheduler.add_job(menu_service.refresh, "interval", minutes=MENU_SYNC_MINUTES)
    # Чистка смен персонала в конце дня (час — конфиг, локальное время кафе)
    scheduler.add_job(staff_bot.end_of_day_cleanup, "cron", hour=settings.shift_end_hour)
    scheduler.start()
    yield
    scheduler.shutdown(wait=False)


app = FastAPI(title="AI Cafe API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(menu.router)
app.include_router(orders.router)
app.include_router(delivery.router)
app.include_router(booking.router)
app.include_router(tables.router)
app.include_router(auth.router)
app.include_router(account.router)
app.include_router(demo.router)
app.include_router(webhooks.router)
app.include_router(sse.router)


@app.get("/api/health")
async def health() -> dict[str, str]:
    return {"status": "ok", "iiko_mode": "mock" if settings.iiko_mock else "cloud"}
