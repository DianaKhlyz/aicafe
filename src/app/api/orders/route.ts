import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { cafe } from "@/lib/config";
import { getIikoClient } from "@/lib/iiko";
import type { Order, OrderItem } from "@/lib/iiko/types";
import { getPaymentProvider } from "@/lib/payments";
import { saveOrder, markPaid } from "@/lib/orders/store";
import { siteUrl } from "@/lib/config";

const createOrderSchema = z.object({
  fulfillment: z.enum(["delivery", "pickup"]),
  customerName: z.string().trim().min(1).max(100),
  phone: z
    .string()
    .trim()
    .regex(/^[+\d][\d\s()-]{9,19}$/, "Неверный формат телефона"),
  address: z.string().trim().max(300).optional(),
  comment: z.string().trim().max(500).optional(),
  paymentMethod: z.enum(["online", "on_delivery"]),
  items: z
    .array(
      z.object({
        productId: z.string(),
        quantity: z.number().int().min(1).max(50),
        optionIds: z.array(z.string()).max(20),
      }),
    )
    .min(1)
    .max(100),
});

/**
 * POST /api/orders — создание заказа.
 * Цены пересчитываются по серверным данным меню: суммам из браузера не доверяем.
 */
export async function POST(request: Request) {
  const parsed = createOrderSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Проверьте правильность заполнения формы" },
      { status: 400 },
    );
  }
  const input = parsed.data;

  if (input.fulfillment === "delivery" && !input.address) {
    return NextResponse.json({ error: "Укажите адрес доставки" }, { status: 400 });
  }

  const iiko = getIikoClient();
  const menu = await iiko.getMenu();

  // пересчёт корзины по серверному меню
  const items: OrderItem[] = [];
  for (const line of input.items) {
    const product = menu.products.find((p) => p.id === line.productId);
    if (!product || product.stopped) {
      return NextResponse.json(
        { error: "Часть блюд закончилась — обновите корзину" },
        { status: 409 },
      );
    }
    const allOptions = product.modifierGroups.flatMap((g) => g.options);
    const options = line.optionIds.map((id) =>
      allOptions.find((o) => o.id === id),
    );
    if (options.some((o) => !o)) {
      return NextResponse.json(
        { error: "Меню обновилось — соберите заказ заново" },
        { status: 409 },
      );
    }
    const unitPrice =
      product.price +
      options.reduce((sum, o) => sum + (o?.priceDelta ?? 0), 0);
    items.push({
      productId: product.id,
      name: product.name,
      unitPrice,
      quantity: line.quantity,
      options: options.map((o) => o!.name),
    });
  }

  const subtotal = items.reduce((s, i) => s + i.unitPrice * i.quantity, 0);
  if (input.fulfillment === "delivery" && subtotal < cafe.delivery.minOrder) {
    return NextResponse.json(
      { error: `Минимальный заказ на доставку — ${cafe.delivery.minOrder} ₽` },
      { status: 400 },
    );
  }
  const deliveryFee =
    input.fulfillment === "delivery" && subtotal < cafe.delivery.freeFrom
      ? cafe.delivery.fee
      : 0;

  const now = new Date().toISOString();
  const order: Order = {
    id: randomUUID(),
    number: String(Math.floor(1000 + Math.random() * 9000)),
    status: "Unconfirmed",
    fulfillment: input.fulfillment,
    customerName: input.customerName,
    phone: input.phone,
    address: input.address,
    comment: input.comment,
    items,
    deliveryFee,
    total: subtotal + deliveryFee,
    paymentMethod: input.paymentMethod,
    paid: false,
    createdAt: now,
    updatedAt: now,
  };
  saveOrder(order);

  // онлайн-оплата: сначала деньги, потом кухня (см. ARCHITECTURE.md)
  let paymentUrl: string | null = null;
  if (input.paymentMethod === "online") {
    const payment = await getPaymentProvider().createPayment({
      orderId: order.id,
      amount: order.total,
      description: `Заказ №${order.number} в ${cafe.name}`,
      returnUrl: `${siteUrl}/order/${order.id}`,
    });
    if (payment.confirmationUrl) {
      // боевой эквайринг: в iiko заказ уйдёт из вебхука об успешной оплате
      return NextResponse.json({ id: order.id, paymentUrl: payment.confirmationUrl });
    }
    markPaid(order.id); // mock: оплата мгновенная
    order.paid = true;
  }

  const { iikoOrderId } = await iiko.createDelivery(order);
  saveOrder({ ...order, iikoOrderId });

  return NextResponse.json({ id: order.id, paymentUrl });
}
