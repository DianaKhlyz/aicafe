from fastapi import APIRouter, Query

from app import schemas
from app.adapters.address import get_address_provider
from app.adapters.iiko import get_iiko_client
from app.services import zones

router = APIRouter(prefix="/api/delivery", tags=["delivery"])


@router.get("/suggest")
async def suggest_address(
    query: str = Query(min_length=3, max_length=200),
) -> list[schemas.AddressSuggestion]:
    """Подсказки адресов для чекаута (DaData или мок, пока нет ключа)."""
    return await get_address_provider().suggest(query)


@router.get("/zones")
async def get_zones() -> list[schemas.DeliveryZone]:
    """Полигоны зон для карты на странице «Доставка»."""
    return await get_iiko_client().get_delivery_zones()


@router.post("/check-address")
async def check_address(request: schemas.AddressCheckRequest) -> schemas.AddressCheckResult:
    """Проверка адреса до оплаты. Координаты — из DaData-подсказок на фронте."""
    return await zones.check_address(request.lat, request.lon)
