"""Меню: кэш поверх iiko + применение стоп-листа.

Синхронизация: периодический синк (APScheduler) + мгновенная
инвалидация вебхуком StopListUpdate. Клиенты узнают об изменениях
по SSE (канал stoplist). Локальное кэширование картинок добавим
при подключении реального клиента iiko.
"""

from app import schemas
from app.adapters.iiko import get_iiko_client
from app.events import bus


class MenuService:
    def __init__(self) -> None:
        self._menu: schemas.Menu | None = None
        self._stop_list: set[str] = set()

    async def get_menu(self) -> schemas.Menu:
        if self._menu is None:
            await self.refresh()
        assert self._menu is not None
        return self._apply_stop_list(self._menu)

    async def refresh(self) -> None:
        client = get_iiko_client()
        self._menu = await client.get_menu()
        self._stop_list = await client.get_stop_list()

    def apply_stop_list_update(self, item_ids: set[str]) -> None:
        """Вызывается вебхуком StopListUpdate: обновляет кэш и оповещает клиентов."""
        self._stop_list = item_ids
        bus.publish("stoplist", sorted(item_ids))

    def toggle_stop(self, item_id: str, stopped: bool) -> set[str]:
        """Для демо-пульта: имитация постановки/снятия стопа как от iiko."""
        updated = set(self._stop_list)
        if stopped:
            updated.add(item_id)
        else:
            updated.discard(item_id)
        self.apply_stop_list_update(updated)
        return updated

    def _apply_stop_list(self, menu: schemas.Menu) -> schemas.Menu:
        marked = menu.model_copy(deep=True)
        for category in marked.categories:
            for item in category.items:
                item.in_stop_list = item.id in self._stop_list
        return marked


menu_service = MenuService()
