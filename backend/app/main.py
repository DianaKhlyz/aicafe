from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import booking, delivery, menu, orders, sse, webhooks
from app.config import settings
from app.db import create_tables
from app.services.menu import menu_service


@asynccontextmanager
async def lifespan(app: FastAPI):
    await create_tables()
    await menu_service.refresh()
    # Периодический синк меню (APScheduler) добавим при подключении
    # реального клиента iiko — на моках он не нужен
    yield


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
app.include_router(webhooks.router)
app.include_router(sse.router)


@app.get("/api/health")
async def health() -> dict[str, str]:
    return {"status": "ok", "iiko_mode": "mock" if settings.iiko_mock else "cloud"}
