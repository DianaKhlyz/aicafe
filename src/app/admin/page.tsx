import type { Metadata } from "next";
import { listOrders } from "@/lib/orders/store";
import { features } from "@/lib/config";

export const metadata: Metadata = { title: "Админка" };
export const dynamic = "force-dynamic";

/**
 * Служебная админка — фаза 0: зеркало заказов и состояние фичефлагов.
 * Фаза 2: авторизация, контент (баннеры, тексты, фото блюд), статус синка
 * меню, журнал ошибок интеграции. Заказы и цены по-прежнему ведутся в iiko —
 * здесь только то, чего в iiko нет.
 */
export default function AdminPage() {
  const orders = listOrders();

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-3xl font-bold">Админка</h1>
        <p className="text-sm text-muted">
          Демо-режим без авторизации. В фазе 1 закрывается входом для персонала.
        </p>
      </div>

      <section>
        <h2 className="mb-3 text-xl font-bold">Фичефлаги</h2>
        <div className="flex flex-wrap gap-2">
          {Object.entries(features).map(([name, enabled]) => (
            <span
              key={name}
              className={`rounded-full px-3 py-1 text-sm font-medium ${
                enabled
                  ? "bg-success/10 text-success"
                  : "bg-line text-muted line-through"
              }`}
            >
              {name}
            </span>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-xl font-bold">
          Заказы за сессию ({orders.length})
        </h2>
        {orders.length === 0 ? (
          <p className="text-sm text-muted">
            Пока пусто — оформите тестовый заказ через сайт.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-card border border-line bg-surface">
            <table className="w-full text-sm">
              <thead className="border-b border-line text-left text-muted">
                <tr>
                  <th className="p-3">№</th>
                  <th className="p-3">Статус</th>
                  <th className="p-3">Получение</th>
                  <th className="p-3">Гость</th>
                  <th className="p-3">Сумма</th>
                  <th className="p-3">Оплата</th>
                  <th className="p-3">Создан</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order.id} className="border-b border-line last:border-0">
                    <td className="p-3 font-semibold">{order.number}</td>
                    <td className="p-3">{order.status}</td>
                    <td className="p-3">
                      {order.fulfillment === "delivery" ? "Доставка" : "Самовывоз"}
                    </td>
                    <td className="p-3">{order.customerName}</td>
                    <td className="p-3">{order.total} ₽</td>
                    <td className="p-3">{order.paid ? "✓ оплачен" : "при получении"}</td>
                    <td className="p-3 text-muted">
                      {new Date(order.createdAt).toLocaleTimeString("ru-RU")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
