"use client";

import { useEffect, useState } from "react";
import type { Order } from "@/lib/iiko/types";
import { StatusTimeline } from "@/components/order/StatusTimeline";

/**
 * Живой трекер: опрашивает статус раз в 5 секунд, пока заказ не в финальном
 * статусе. Фаза 2: заменить поллинг на SSE, чтобы совсем не дёргать сервер.
 */
export function OrderTracker({ orderId }: { orderId: string }) {
  const [order, setOrder] = useState<Order | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let stopped = false;

    async function load() {
      const res = await fetch(`/api/orders/${orderId}`, { cache: "no-store" });
      if (stopped) return;
      if (res.status === 404) {
        setNotFound(true);
        return;
      }
      if (res.ok) {
        const data = (await res.json()) as Order;
        setOrder(data);
        if (["Delivered", "Closed", "Cancelled"].includes(data.status)) {
          stopped = true;
        }
      }
    }

    load();
    const timer = setInterval(() => {
      if (!stopped) load();
    }, 5000);
    return () => {
      stopped = true;
      clearInterval(timer);
    };
  }, [orderId]);

  if (notFound) {
    return (
      <p className="text-muted">
        Заказ не найден. В dev-режиме заказы живут в памяти сервера и
        пропадают при его перезапуске.
      </p>
    );
  }

  if (!order) {
    return <p className="animate-pulse text-muted">Загружаем заказ…</p>;
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="text-3xl font-bold">Заказ №{order.number}</h1>
        <span className="text-sm text-muted">
          {order.fulfillment === "delivery" ? "Доставка" : "Самовывоз"} ·{" "}
          {order.paid ? "оплачен" : "оплата при получении"}
        </span>
      </div>

      <div className="rounded-card border border-line bg-surface p-5">
        <StatusTimeline status={order.status} fulfillment={order.fulfillment} />
      </div>

      <div className="rounded-card border border-line bg-surface p-5 text-sm">
        <h2 className="mb-3 font-semibold">Состав заказа</h2>
        <ul className="flex flex-col gap-2">
          {order.items.map((item, i) => (
            <li key={i} className="flex justify-between gap-3">
              <span>
                {item.name}
                {item.options.length > 0 && (
                  <span className="text-muted"> · {item.options.join(", ")}</span>
                )}
                <span className="text-muted"> × {item.quantity}</span>
              </span>
              <span className="whitespace-nowrap">
                {item.unitPrice * item.quantity} ₽
              </span>
            </li>
          ))}
          {order.deliveryFee > 0 && (
            <li className="flex justify-between text-muted">
              <span>Доставка</span>
              <span>{order.deliveryFee} ₽</span>
            </li>
          )}
        </ul>
        <div className="mt-3 flex justify-between border-t border-line pt-3 font-bold">
          <span>Итого</span>
          <span>{order.total} ₽</span>
        </div>
      </div>
    </div>
  );
}
