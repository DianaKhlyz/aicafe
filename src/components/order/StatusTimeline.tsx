import type { Fulfillment, OrderStatus } from "@/lib/iiko/types";

/**
 * Лента статусов заказа («как у Додо»). Статусная модель — iikoCloud,
 * подписи адаптируются под способ получения.
 */

const STEPS: Array<{
  statuses: OrderStatus[];
  delivery: string;
  pickup: string;
}> = [
  {
    statuses: ["Unconfirmed"],
    delivery: "Заказ принят",
    pickup: "Заказ принят",
  },
  {
    statuses: ["WaitCooking", "CookingStarted"],
    delivery: "Готовим",
    pickup: "Готовим",
  },
  {
    statuses: ["CookingCompleted"],
    delivery: "Приготовлен",
    pickup: "Готов — можно забирать!",
  },
  {
    statuses: ["OnWay"],
    delivery: "Курьер в пути",
    pickup: "Ждёт вас на кассе",
  },
  {
    statuses: ["Delivered", "Closed"],
    delivery: "Доставлен. Приятного аппетита!",
    pickup: "Выдан. Приятного аппетита!",
  },
];

export function StatusTimeline({
  status,
  fulfillment,
}: {
  status: OrderStatus;
  fulfillment: Fulfillment;
}) {
  if (status === "Cancelled") {
    return (
      <div className="rounded-card border border-danger/30 bg-danger/5 p-4 font-medium text-danger">
        Заказ отменён. Если это ошибка — позвоните нам, разберёмся.
      </div>
    );
  }

  const activeIndex = STEPS.findIndex((s) => s.statuses.includes(status));

  return (
    <ol className="flex flex-col gap-0">
      {STEPS.map((step, i) => {
        const done = i < activeIndex;
        const active = i === activeIndex;
        return (
          <li key={step.delivery} className="flex gap-3">
            <div className="flex flex-col items-center">
              <span
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                  done
                    ? "bg-success text-white"
                    : active
                      ? "bg-brand text-white"
                      : "border border-line bg-surface text-muted"
                }`}
              >
                {done ? "✓" : i + 1}
              </span>
              {i < STEPS.length - 1 && (
                <span
                  className={`w-0.5 flex-1 ${done ? "bg-success" : "bg-line"}`}
                />
              )}
            </div>
            <p
              className={`pb-6 pt-1.5 text-sm ${
                active ? "font-semibold" : done ? "text-ink" : "text-muted"
              }`}
            >
              {fulfillment === "delivery" ? step.delivery : step.pickup}
              {active && (
                <span className="ml-2 inline-block animate-pulse text-brand">
                  ●
                </span>
              )}
            </p>
          </li>
        );
      })}
    </ol>
  );
}
