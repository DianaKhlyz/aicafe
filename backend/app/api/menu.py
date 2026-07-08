from fastapi import APIRouter

from app import schemas
from app.services.menu import menu_service

router = APIRouter(prefix="/api/menu", tags=["menu"])


@router.get("")
async def get_menu() -> schemas.Menu:
    """Меню с применённым стоп-листом (источник — внешнее меню iiko)."""
    return await menu_service.get_menu()
