"""Общая корзина стола: все гости за столом наполняют одну корзину
со своих телефонов и видят изменения друг друга в реальном времени
(SSE-канал table-cart).

Хранение — в памяти процесса: корзина стола живёт минуты и очищается
при чекауте, терять её при рестарте не страшно. Той же механикой работает
«скинь ссылку коллегам» для группового заказа доставки.
"""

from datetime import UTC, datetime

from app import schemas
from app.events import bus
from app.services.menu import menu_service

# (стол, блюдо, гость) -> количество
_Key = tuple[str, str, str]


class TableCartService:
    def __init__(self) -> None:
        self._quantities: dict[_Key, int] = {}

    async def get(self, table_code: str) -> schemas.TableCart:
        menu = await menu_service.get_menu()
        catalog = {i.id: i for c in menu.categories for i in c.items}
        lines = [
            schemas.TableCartLine(
                item_id=item_id,
                name=catalog[item_id].name if item_id in catalog else item_id,
                price=catalog[item_id].price if item_id in catalog else 0,
                quantity=quantity,
                guest=guest,
            )
            for (code, item_id, guest), quantity in sorted(self._quantities.items())
            if code == table_code
        ]
        return schemas.TableCart(
            table_code=table_code,
            lines=lines,
            total=sum(line.price * line.quantity for line in lines),
            updated_at=datetime.now(UTC),
        )

    async def update(self, table_code: str, change: schemas.TableCartUpdate) -> schemas.TableCart:
        key: _Key = (table_code, change.item_id, change.guest.strip() or "Гость")
        if change.quantity == 0:
            self._quantities.pop(key, None)
        else:
            self._quantities[key] = change.quantity
        cart = await self.get(table_code)
        bus.publish("table-cart", {"table_code": table_code})
        return cart

    def items_for_order(self, table_code: str) -> list[schemas.CartItem]:
        """Строки корзины стола для чекаута (гости складываются по блюду)."""
        totals: dict[str, int] = {}
        for (code, item_id, _guest), quantity in self._quantities.items():
            if code == table_code:
                totals[item_id] = totals.get(item_id, 0) + quantity
        return [schemas.CartItem(item_id=item_id, quantity=qty) for item_id, qty in totals.items()]

    def clear(self, table_code: str) -> None:
        for key in [k for k in self._quantities if k[0] == table_code]:
            del self._quantities[key]
        bus.publish("table-cart", {"table_code": table_code})


table_cart_service = TableCartService()
