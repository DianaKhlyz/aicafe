import { NextResponse } from "next/server";
import type { OrderStatus } from "@/lib/iiko/types";
import { listOrders, updateOrderStatus } from "@/lib/orders/store";

/**
 * POST /api/webhooks/iiko — приёмник вебхуков iikoCloud.
 * Настраивается через POST /api/1/webhooks/update_settings (см. docs/IIKO-INTEGRATION.md).
 *
 * Правила: отвечаем 200 быстро, события идемпотентны, всё сырое — в журнал.
 * В mock-режиме не используется (статусы эмулирует orders/store.ts).
 */

interface IikoWebhookEvent {
  eventType?: string; // DeliveryOrderUpdate | StopListUpdate | ...
  eventInfo?: {
    id?: string; // iikoOrderId
    order?: { status?: string };
  };
}

export async function POST(request: Request) {
  // TODO(фаза 1): сверять authToken вебхука с IIKO_WEBHOOK_AUTH_TOKEN
  const events = (await request.json().catch(() => [])) as IikoWebhookEvent[];

  for (const event of Array.isArray(events) ? events : [events]) {
    switch (event.eventType) {
      case "DeliveryOrderUpdate": {
        const iikoOrderId = event.eventInfo?.id;
        const status = event.eventInfo?.order?.status as OrderStatus | undefined;
        if (!iikoOrderId || !status) break;
        // TODO(фаза 1): при переходе на PostgreSQL — поиск по индексу iiko_order_id
        const order = listOrders().find((o) => o.iikoOrderId === iikoOrderId);
        if (order) updateOrderStatus(order.id, status);
        break;
      }
      case "StopListUpdate":
        // TODO(фаза 1): пометить позиции stopped и инвалидировать кэш меню
        // (revalidatePath("/menu"))
        break;
      default:
        break; // незнакомые события просто подтверждаем
    }
  }

  return NextResponse.json({ ok: true });
}
