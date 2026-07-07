"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { cafe } from "@/lib/config";
import { cartTotal, useCart } from "@/store/cart";

export default function CartPage() {
  const { lines, setQuantity, remove, clear } = useCart();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) return null;

  if (lines.length === 0) {
    return (
      <div className="mx-auto max-w-md py-16 text-center">
        <div className="mb-4 text-5xl">🛒</div>
        <h1 className="mb-2 text-2xl font-bold">Корзина пуста</h1>
        <p className="mb-6 text-muted">Самое время это исправить</p>
        <Link href="/menu" className="btn-primary">
          Перейти в меню
        </Link>
      </div>
    );
  }

  const total = cartTotal(lines);
  const missing = cafe.delivery.minOrder - total;

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-6 text-3xl font-bold">Корзина</h1>

      <ul className="flex flex-col gap-3">
        {lines.map((line) => (
          <li
            key={line.key}
            className="flex items-center gap-4 rounded-card border border-line bg-surface p-4"
          >
            <div className="min-w-0 flex-1">
              <div className="font-semibold">{line.name}</div>
              {line.optionNames.length > 0 && (
                <div className="text-xs text-muted">
                  {line.optionNames.join(", ")}
                </div>
              )}
              <div className="mt-1 text-sm text-muted">
                {line.unitPrice} ₽ / шт
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                className="btn-secondary h-8 w-8 p-0"
                onClick={() => setQuantity(line.key, line.quantity - 1)}
                aria-label="Убавить"
              >
                −
              </button>
              <span className="w-6 text-center font-semibold">
                {line.quantity}
              </span>
              <button
                type="button"
                className="btn-secondary h-8 w-8 p-0"
                onClick={() => setQuantity(line.key, line.quantity + 1)}
                aria-label="Прибавить"
              >
                +
              </button>
            </div>

            <div className="w-20 text-right font-bold">
              {line.unitPrice * line.quantity} ₽
            </div>

            <button
              type="button"
              className="text-muted hover:text-danger"
              onClick={() => remove(line.key)}
              aria-label="Удалить позицию"
            >
              ✕
            </button>
          </li>
        ))}
      </ul>

      <div className="mt-6 rounded-card border border-line bg-surface p-4">
        <div className="flex justify-between text-lg font-bold">
          <span>Итого</span>
          <span>{total} ₽</span>
        </div>
        {missing > 0 && (
          <p className="mt-1 text-sm text-danger">
            До минимального заказа на доставку не хватает {missing} ₽
            (самовывоз доступен на любую сумму)
          </p>
        )}
        {total < cafe.delivery.freeFrom && missing <= 0 && (
          <p className="mt-1 text-sm text-muted">
            Добавьте ещё на {cafe.delivery.freeFrom - total} ₽ — доставка станет
            бесплатной
          </p>
        )}
        <div className="mt-4 flex justify-between gap-3">
          <button type="button" className="btn-secondary" onClick={clear}>
            Очистить
          </button>
          <Link href="/checkout" className="btn-primary flex-1 text-center">
            Оформить заказ
          </Link>
        </div>
      </div>
    </div>
  );
}
