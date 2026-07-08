// Подписка на SSE-канал бэкенда (/api/events).
// Каналы: stoplist, orders, reserves; позже — общая корзина стола.
import { useEffect } from "react";

export function useSSE(channel: string, onEvent: (data: unknown) => void) {
  useEffect(() => {
    const source = new EventSource("/api/events");
    const handler = (event: MessageEvent) => onEvent(JSON.parse(event.data));
    source.addEventListener(channel, handler);
    return () => {
      source.removeEventListener(channel, handler);
      source.close();
    };
  }, [channel, onEvent]);
}
