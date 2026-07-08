from fastapi import APIRouter

from app import schemas
from app.adapters.iiko import get_iiko_client
from app.events import bus

router = APIRouter(prefix="/api/booking", tags=["booking"])


@router.get("/sections")
async def get_sections() -> list[schemas.Section]:
    """Схема залов со столами для интерактивной карты (координаты — из iiko).

    TODO на реальном iiko: занятость по выбранному времени (?date=), а не
    только текущая — доступность слотов посчитаем из списка резервов.
    """
    return await get_iiko_client().get_sections()


@router.post("/reserve")
async def create_reserve(request: schemas.ReserveRequest) -> schemas.ReserveView:
    reserve = await get_iiko_client().create_reserve(request)
    # Бронь с сайта — оповещаем открытые карты залов сразу; брони, сделанные
    # хостес в iiko, придут тем же каналом через вебхук ReserveUpdate
    bus.publish("reserves", {"table_id": reserve.table_id, "status": reserve.status})
    return reserve
