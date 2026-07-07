import { NextResponse } from "next/server";
import { getIikoClient } from "@/lib/iiko";
import { getPaymentProvider } from "@/lib/payments";
import { getOrder, markPaid, saveOrder } from "@/lib/orders/store";

/**
 * POST /api/webhooks/payment — вебхук эквайринга об успешной оплате.
 * Именно здесь оплаченный заказ уходит в iiko: деньги → кухня.
 */
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const result = await getPaymentProvider().parseWebhook(body);
  if (!result) {
    return NextResponse.json({ ok: true }); // не наше событие — подтверждаем
  }

  const order = getOrder(result.orderId);
  if (!order || order.paid) {
    return NextResponse.json({ ok: true }); // идемпотентность: повтор — не ошибка
  }

  markPaid(order.id);
  const { iikoOrderId } = await getIikoClient().createDelivery({
    ...order,
    paid: true,
  });
  saveOrder({ ...getOrder(order.id)!, iikoOrderId });

  return NextResponse.json({ ok: true });
}
