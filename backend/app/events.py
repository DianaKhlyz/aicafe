"""Внутрипроцессная шина событий для SSE.

Вебхуки iiko/эквайринга публикуют события, открытые SSE-соединения
клиентов их получают. Одного процесса достаточно (см. docs/architecture.md);
при переходе на несколько воркеров заменим на Redis pub/sub — интерфейс
останется тем же.
"""

import asyncio
from typing import Any

Event = dict[str, Any]


class EventBus:
    def __init__(self) -> None:
        self._subscribers: set[asyncio.Queue[Event]] = set()

    def subscribe(self) -> asyncio.Queue[Event]:
        queue: asyncio.Queue[Event] = asyncio.Queue()
        self._subscribers.add(queue)
        return queue

    def unsubscribe(self, queue: asyncio.Queue[Event]) -> None:
        self._subscribers.discard(queue)

    def publish(self, channel: str, data: Any) -> None:
        event: Event = {"channel": channel, "data": data}
        for queue in self._subscribers:
            queue.put_nowait(event)


bus = EventBus()
