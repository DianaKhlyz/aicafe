from fastapi import APIRouter

from app import schemas
from app.services.table_cart import table_cart_service

router = APIRouter(prefix="/api/tables", tags=["tables"])


@router.get("/{table_code}/cart")
async def get_table_cart(table_code: str) -> schemas.TableCart:
    """Общая корзина стола — одна на всех гостей, вошедших по QR."""
    return await table_cart_service.get(table_code)


@router.post("/{table_code}/cart")
async def update_table_cart(
    table_code: str, change: schemas.TableCartUpdate
) -> schemas.TableCart:
    """Гость добавляет/меняет позицию; остальные видят по SSE (канал table-cart)."""
    return await table_cart_service.update(table_code, change)
