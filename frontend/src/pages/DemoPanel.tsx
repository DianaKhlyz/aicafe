// Демо-пульт (/demo, не в навигации): кнопочная имитация событий iiko
// для показа возможностей. Работает только в мок-режиме — в бою бэкенд
// отвечает 404, и страница честно об этом говорит.
// Рецепт показа: сайт на телефоне, пульт на ноутбуке рядом.
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { api } from "../api/client";
import type { components } from "../api/schema";
import { useMenu } from "./Menu";

type TelegramResult = components["schemas"]["TelegramTestResult"];

const STATUS_LABELS: Record<string, string> = {
  new: "Принят",
  cooking: "Готовится",
  ready: "Готов",
  on_the_way: "В пути",
  closed: "Завершён",
  cancelled: "Отменён",
};

const MODE_LABELS: Record<string, string> = {
  delivery: "Доставка",
  pickup: "Самовывоз",
  table: "Стол",
};

export function DemoPanelPage() {
  const queryClient = useQueryClient();
  const [telegramResult, setTelegramResult] = useState<TelegramResult | null>(null);

  const status = useQuery({
    queryKey: ["demo-status"],
    retry: false,
    queryFn: async () => {
      const { data, response } = await api.GET("/api/demo/status");
      if (response.status === 404) return null;
      return data ?? null;
    },
  });

  const { data: menu } = useMenu();

  const orders = useQuery({
    queryKey: ["demo-orders"],
    enabled: Boolean(status.data?.enabled),
    refetchInterval: 5000,
    queryFn: async () => {
      const { data, error } = await api.GET("/api/demo/orders");
      if (error) throw error;
      return data;
    },
  });

  const toggleStop = useMutation({
    mutationFn: async (body: { item_id: string; stopped: boolean }) => {
      const { error } = await api.POST("/api/demo/stoplist", { body });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["menu"] }),
  });

  const nextStatus = useMutation({
    mutationFn: async (orderId: string) => {
      const { error } = await api.POST("/api/demo/orders/{order_id}/next-status", {
        params: { path: { order_id: orderId } },
      });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["demo-orders"] }),
  });

  const telegramTest = useMutation({
    mutationFn: async () => {
      const { data, error } = await api.POST("/api/demo/telegram-test");
      if (error) throw error;
      return data;
    },
    onSuccess: (result) => setTelegramResult(result),
  });

  if (status.isPending) return <p>Загружаем пульт…</p>;
  if (!status.data?.enabled) {
    return (
      <div>
        <h1>Демо-пульт</h1>
        <p>
          Пульт доступен только в демо-режиме (AICAFE_IIKO_MOCK=true). В боевом режиме события
          приходят от настоящего iiko.
        </p>
      </div>
    );
  }

  const dishes = (menu?.categories ?? []).flatMap((category) => category.items);

  return (
    <div className="demo-panel">
      <h1>Демо-пульт</h1>
      <p className="form-hint">
        Имитация событий iiko для показа. Откройте сайт в соседнем окне или на телефоне —
        изменения прилетают туда мгновенно.
      </p>

      <section>
        <h2>Стоп-лист</h2>
        <p className="form-hint">Как будто на кассе поставили/сняли стоп — блюдо гаснет у всех.</p>
        <ul className="demo-list">
          {dishes.map((dish) => (
            <li key={dish.id}>
              <span className={dish.in_stop_list ? "demo-stopped" : ""}>{dish.name}</span>
              <button
                disabled={toggleStop.isPending}
                onClick={() =>
                  toggleStop.mutate({ item_id: dish.id, stopped: !dish.in_stop_list })
                }
              >
                {dish.in_stop_list ? "Вернуть в меню" : "Поставить в стоп"}
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2>Статусы заказов</h2>
        <p className="form-hint">
          Как будто кухня/курьер меняют статус — открытый трекер обновится сам. Сначала оформите
          заказ на сайте.
        </p>
        {(orders.data ?? []).length === 0 && <p>Заказов пока нет.</p>}
        <ul className="demo-list">
          {(orders.data ?? []).map((order) => (
            <li key={order.id}>
              <span>
                {MODE_LABELS[order.mode]} · {order.amount} ₽ ·{" "}
                <strong>{STATUS_LABELS[order.status]}</strong>
              </span>
              <button
                disabled={order.status === "closed" || nextStatus.isPending}
                onClick={() => nextStatus.mutate(order.id)}
              >
                {order.status === "closed" ? "Завершён" : "Следующий статус →"}
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2>Telegram</h2>
        <p className="form-hint">
          Проверка уведомлений персоналу.{" "}
          {status.data.telegram_configured
            ? "Бот настроен."
            : "Бот не настроен — кнопка покажет, чего не хватает."}
        </p>
        <button
          className="button-primary"
          disabled={telegramTest.isPending}
          onClick={() => telegramTest.mutate()}
        >
          Отправить тестовое сообщение
        </button>
        {telegramResult && (
          <p className={telegramResult.ok ? "form-hint form-hint--ok" : "form-error"}>
            {telegramResult.detail}
          </p>
        )}
      </section>
    </div>
  );
}
