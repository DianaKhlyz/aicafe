import type { Order, OrderStatus } from "@/lib/iiko/types";
import { mockStatusForAge } from "@/lib/iiko/mock/client";

/**
 * In-memory зеркало заказов — временная замена PostgreSQL для фазы 0
 * (модель данных для БД описана в docs/ARCHITECTURE.md).
 *
 * Хранилище вешается на globalThis, чтобы переживать hot-reload в dev.
 * В mock-режиме статус заказа «живёт»: вычисляется из возраста заказа,
 * эмулируя вебхуки DeliveryOrderUpdate.
 */

const globalStore = globalThis as unknown as {
  __aicafeOrders?: Map<string, Order>;
};

function orders(): Map<string, Order> {
  globalStore.__aicafeOrders ??= new Map();
  return globalStore.__aicafeOrders;
}

export function saveOrder(order: Order): void {
  orders().set(order.id, order);
}

export function getOrder(id: string): Order | null {
  const order = orders().get(id);
  if (!order) return null;

  if (process.env.IIKO_MODE !== "cloud" && !isFinal(order.status)) {
    // эмуляция движения заказа по кухне
    const ageSeconds = (Date.now() - Date.parse(order.createdAt)) / 1000;
    const simulated = mockStatusForAge(ageSeconds);
    if (simulated !== order.status) {
      updateOrderStatus(id, simulated);
      return orders().get(id) ?? null;
    }
  }
  return order;
}

/** Единая точка обновления статуса — сюда же пишут обработчики вебхуков */
export function updateOrderStatus(id: string, status: OrderStatus): void {
  const order = orders().get(id);
  if (!order) return;
  orders().set(id, {
    ...order,
    status,
    updatedAt: new Date().toISOString(),
  });
}

export function markPaid(id: string): void {
  const order = orders().get(id);
  if (!order) return;
  orders().set(id, { ...order, paid: true, updatedAt: new Date().toISOString() });
}

export function listOrders(): Order[] {
  return [...orders().values()].sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt),
  );
}

function isFinal(status: OrderStatus): boolean {
  return status === "Delivered" || status === "Closed" || status === "Cancelled";
}
