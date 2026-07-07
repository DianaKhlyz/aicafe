import { NextResponse } from "next/server";
import { getOrder } from "@/lib/orders/store";

/** GET /api/orders/[id] — статус и состав заказа для трекера */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const order = getOrder(id);
  if (!order) {
    return NextResponse.json({ error: "Заказ не найден" }, { status: 404 });
  }
  // телефон и адрес наружу не отдаём: ссылка на трекер публичная
  const { phone, address, ...safe } = order;
  void phone;
  void address;
  return NextResponse.json(safe);
}
