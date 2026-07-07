import type { Metadata } from "next";
import { OrderTracker } from "./OrderTracker";

export const metadata: Metadata = { title: "Ваш заказ" };

export default async function OrderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <div className="mx-auto max-w-2xl">
      <OrderTracker orderId={id} />
    </div>
  );
}
