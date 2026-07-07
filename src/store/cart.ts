"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

/**
 * Корзина. Живёт в localStorage — гость собирает заказ без аккаунта.
 * Позиция уникальна по продукту + набору выбранных модификаторов.
 */

export interface CartLine {
  /** productId + отсортированные id опций */
  key: string;
  productId: string;
  name: string;
  /** Цена за единицу с учётом модификаторов, ₽ */
  unitPrice: number;
  quantity: number;
  optionIds: string[];
  /** Читаемые названия выбранных опций */
  optionNames: string[];
}

interface CartState {
  lines: CartLine[];
  add(line: Omit<CartLine, "key" | "quantity">, quantity?: number): void;
  setQuantity(key: string, quantity: number): void;
  remove(key: string): void;
  clear(): void;
}

export function lineKey(productId: string, optionIds: string[]): string {
  return [productId, ...[...optionIds].sort()].join("|");
}

export const useCart = create<CartState>()(
  persist(
    (set) => ({
      lines: [],

      add(line, quantity = 1) {
        set((state) => {
          const key = lineKey(line.productId, line.optionIds);
          const existing = state.lines.find((l) => l.key === key);
          if (existing) {
            return {
              lines: state.lines.map((l) =>
                l.key === key ? { ...l, quantity: l.quantity + quantity } : l,
              ),
            };
          }
          return { lines: [...state.lines, { ...line, key, quantity }] };
        });
      },

      setQuantity(key, quantity) {
        set((state) => ({
          lines:
            quantity <= 0
              ? state.lines.filter((l) => l.key !== key)
              : state.lines.map((l) => (l.key === key ? { ...l, quantity } : l)),
        }));
      },

      remove(key) {
        set((state) => ({ lines: state.lines.filter((l) => l.key !== key) }));
      },

      clear() {
        set({ lines: [] });
      },
    }),
    { name: "aicafe-cart" },
  ),
);

export function cartTotal(lines: CartLine[]): number {
  return lines.reduce((sum, l) => sum + l.unitPrice * l.quantity, 0);
}

export function cartCount(lines: CartLine[]): number {
  return lines.reduce((sum, l) => sum + l.quantity, 0);
}
