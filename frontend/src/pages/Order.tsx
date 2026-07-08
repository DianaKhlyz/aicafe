// Живой трекер заказа: статус приходит вебхуком DeliveryOrderUpdate
// из iiko -> SSE-канал orders -> страница обновляется без перезагрузки.
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import { useParams } from "react-router-dom";
import { api } from "../api/client";
import { useSSE } from "../shared/useSSE";

const DELIVERY_STEPS: [string, string][] = [
  ["new", "Принят"],
  ["cooking", "Готовится"],
  ["on_the_way", "В пути"],
  ["closed", "Доставлен"],
];

const PICKUP_STEPS: [string, string][] = [
  ["new", "Принят"],
  ["cooking", "Готовится"],
  ["ready", "Готов к выдаче"],
  ["closed", "Выдан"],
];

const TABLE_STEPS: [string, string][] = [
  ["new", "Принят"],
  ["cooking", "Готовится"],
  ["ready", "Несём к столу"],
  ["closed", "Подан"],
];

export function OrderPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const queryClient = useQueryClient();

  const { data: order, isPending } = useQuery({
    queryKey: ["order", orderId],
    queryFn: async () => {
      const { data, error } = await api.GET("/api/orders/{order_id}", {
        params: { path: { order_id: orderId! } },
      });
      if (error) throw error;
      return data;
    },
    enabled: Boolean(orderId),
  });

  const onOrderEvent = useCallback(
    (data: unknown) => {
      if ((data as { id?: string }).id === orderId) {
        queryClient.invalidateQueries({ queryKey: ["order", orderId] });
      }
    },
    [orderId, queryClient],
  );
  useSSE("orders", onOrderEvent);

  if (isPending) return <p>Загружаем заказ…</p>;
  if (!order) return <h1>Заказ не найден</h1>;

  if (order.status === "cancelled") {
    return (
      <div>
        <h1>Заказ отменён</h1>
        <p>Если это ошибка — позвоните нам, разберёмся.</p>
      </div>
    );
  }

  const steps =
    order.mode === "delivery"
      ? DELIVERY_STEPS
      : order.mode === "pickup"
        ? PICKUP_STEPS
        : TABLE_STEPS;
  const currentIndex = Math.max(
    steps.findIndex(([status]) => status === order.status),
    0,
  );

  return (
    <div className="order-tracker">
      <h1>Ваш заказ</h1>
      <ol className="tracker-steps">
        {steps.map(([status, label], index) => (
          <li
            key={status}
            className={
              index < currentIndex
                ? "step step--done"
                : index === currentIndex
                  ? "step step--current"
                  : "step"
            }
          >
            {label}
          </li>
        ))}
      </ol>
      {order.eta_minutes != null && order.status !== "closed" && (
        <p>Будет готов примерно через {order.eta_minutes} мин.</p>
      )}
      <p className="form-hint">
        Оплата: {order.payment_status === "paid" ? "получена" : "ожидается"}. Статус обновляется
        автоматически.
      </p>
    </div>
  );
}
