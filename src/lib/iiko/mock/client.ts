import type { IikoClient, Menu, Order, OrderStatus } from "../types";
import { mockMenu } from "./data";

/**
 * Мок-реализация iiko: сайт полностью работает без ключей и интернета.
 * Жизненный цикл заказа эмулируется по времени с момента создания —
 * трекер заказа показывает «живое» движение статусов.
 */

/** Секунды от создания заказа до перехода в статус */
const STATUS_TIMELINE: Array<[seconds: number, status: OrderStatus]> = [
  [0, "Unconfirmed"],
  [10, "WaitCooking"],
  [20, "CookingStarted"],
  [50, "CookingCompleted"],
  [65, "OnWay"],
  [100, "Delivered"],
];

export function mockStatusForAge(ageSeconds: number): OrderStatus {
  let current: OrderStatus = "Unconfirmed";
  for (const [after, status] of STATUS_TIMELINE) {
    if (ageSeconds >= after) current = status;
  }
  return current;
}

export class MockIikoClient implements IikoClient {
  async getMenu(): Promise<Menu> {
    return mockMenu;
  }

  async createDelivery(order: Order): Promise<{ iikoOrderId: string }> {
    return { iikoOrderId: `mock-iiko-${order.id}` };
  }

  async getOrderStatus(iikoOrderId: string): Promise<OrderStatus> {
    // id мок-заказа не содержит времени создания, поэтому здесь просто
    // возвращаем начальный статус; реальную эмуляцию делает orders/store.ts
    void iikoOrderId;
    return "Unconfirmed";
  }
}
