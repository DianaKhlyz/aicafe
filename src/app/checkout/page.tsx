"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { cafe } from "@/lib/config";
import type { Fulfillment, PaymentMethod } from "@/lib/iiko/types";
import { cartTotal, useCart } from "@/store/cart";

export default function CheckoutPage() {
  const router = useRouter();
  const { lines, clear } = useCart();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const [fulfillment, setFulfillment] = useState<Fulfillment>("delivery");
  const [payment, setPayment] = useState<PaymentMethod>("online");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!mounted) return null;

  if (lines.length === 0) {
    return (
      <div className="mx-auto max-w-md py-16 text-center">
        <h1 className="mb-2 text-2xl font-bold">Нечего оформлять</h1>
        <Link href="/menu" className="btn-primary mt-4">
          В меню
        </Link>
      </div>
    );
  }

  const subtotal = cartTotal(lines);
  const deliveryFee =
    fulfillment === "delivery" && subtotal < cafe.delivery.freeFrom
      ? cafe.delivery.fee
      : 0;
  const total = subtotal + deliveryFee;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fulfillment,
          customerName: name,
          phone,
          address: fulfillment === "delivery" ? address : undefined,
          comment: comment || undefined,
          paymentMethod: payment,
          items: lines.map((l) => ({
            productId: l.productId,
            quantity: l.quantity,
            optionIds: l.optionIds,
          })),
        }),
      });
      const data = (await res.json()) as {
        id?: string;
        paymentUrl?: string | null;
        error?: string;
      };
      if (!res.ok || !data.id) {
        throw new Error(data.error ?? "Не получилось оформить заказ");
      }
      clear();
      // при боевом эквайринге сначала уводим гостя на страницу оплаты
      if (data.paymentUrl) {
        window.location.href = data.paymentUrl;
      } else {
        router.push(`/order/${data.id}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка, попробуйте ещё раз");
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-6 text-3xl font-bold">Оформление заказа</h1>

      <form onSubmit={submit} className="flex flex-col gap-6">
        {/* способ получения */}
        <div className="grid grid-cols-2 gap-2">
          {(
            [
              ["delivery", `🛵 Доставка ~${cafe.delivery.etaMinutes} мин`],
              ["pickup", "🏃 Самовывоз (быстрее)"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setFulfillment(value)}
              className={`rounded-field border px-4 py-3 text-sm font-semibold ${
                fulfillment === value
                  ? "border-brand bg-brand-soft text-brand-dark"
                  : "border-line bg-surface"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="flex flex-col gap-3 rounded-card border border-line bg-surface p-4">
          <input
            className="field"
            placeholder="Имя"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <input
            className="field"
            placeholder="Телефон, +7..."
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            required
          />
          {fulfillment === "delivery" && (
            /* фаза 1: подсказки DaData + проверка зоны доставки */
            <input
              className="field"
              placeholder="Адрес доставки: улица, дом, квартира"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              required
            />
          )}
          <textarea
            className="field"
            placeholder="Комментарий к заказу (необязательно)"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={2}
          />
        </div>

        {/* оплата */}
        <div className="grid grid-cols-2 gap-2">
          {(
            [
              ["online", "💳 Онлайн (карта / СБП)"],
              ["on_delivery", "💵 При получении"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setPayment(value)}
              className={`rounded-field border px-4 py-3 text-sm font-semibold ${
                payment === value
                  ? "border-brand bg-brand-soft text-brand-dark"
                  : "border-line bg-surface"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* итог */}
        <div className="rounded-card border border-line bg-surface p-4 text-sm">
          <div className="flex justify-between">
            <span>Заказ</span>
            <span>{subtotal} ₽</span>
          </div>
          {fulfillment === "delivery" && (
            <div className="flex justify-between text-muted">
              <span>Доставка</span>
              <span>{deliveryFee === 0 ? "бесплатно" : `${deliveryFee} ₽`}</span>
            </div>
          )}
          <div className="mt-2 flex justify-between border-t border-line pt-2 text-lg font-bold">
            <span>Итого</span>
            <span>{total} ₽</span>
          </div>
        </div>

        {error && <p className="text-sm font-medium text-danger">{error}</p>}

        <button type="submit" className="btn-primary py-3" disabled={submitting}>
          {submitting
            ? "Оформляем..."
            : payment === "online"
              ? `Оплатить ${total} ₽`
              : "Оформить заказ"}
        </button>

        <p className="text-center text-xs text-muted">
          Нажимая кнопку, вы соглашаетесь с{" "}
          <Link href="/legal/offer" className="underline">
            офертой
          </Link>{" "}
          и{" "}
          <Link href="/legal/privacy" className="underline">
            политикой обработки персональных данных
          </Link>
        </p>
      </form>
    </div>
  );
}
