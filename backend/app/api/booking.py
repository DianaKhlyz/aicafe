from fastapi import APIRouter

from app import schemas
from app.adapters.iiko import get_iiko_client

router = APIRouter(prefix="/api/booking", tags=["booking"])


@router.get("/sections")
async def get_sections() -> list[schemas.Section]:
    """Схема залов со столами для интерактивной карты (координаты — из iiko)."""
    return await get_iiko_client().get_sections()


@router.post("/reserve")
async def create_reserve(request: schemas.ReserveRequest) -> schemas.ReserveView:
    return await get_iiko_client().create_reserve(request)
