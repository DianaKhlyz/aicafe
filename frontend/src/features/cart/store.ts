// Корзина: единая для всех режимов (доставка / самовывоз / за столом).
// Контекст стола задаётся при входе через QR (/t/{code}) и переключает чекаут.
// Персистится в localStorage, чтобы корзина переживала обновление страницы.
import { create } from "zustand";
import { persist } from "zustand/middleware";

export type OrderMode = "delivery" | "pickup" | "table";

export interface CartLine {
  itemId: string;
  name: string;
  price: number;
  quantity: number;
}

interface CartState {
  lines: CartLine[];
  mode: OrderMode;
  tableCode: string | null;
  add: (item: Omit<CartLine, "quantity">) => void;
  remove: (itemId: string) => void;
  setQuantity: (itemId: string, quantity: number) => void;
  enterTableMode: (tableCode: string) => void;
  setMode: (mode: OrderMode) => void;
  clear: () => void;
  total: () => number;
}

export const useCart = create<CartState>()(
  persist(
    (set, get) => ({
      lines: [],
      mode: "delivery",
      tableCode: null,

      add: (item) =>
        set((state) => {
          const existing = state.lines.find((line) => line.itemId === item.itemId);
          if (existing) {
            return {
              lines: state.lines.map((line) =>
                line.itemId === item.itemId ? { ...line, quantity: line.quantity + 1 } : line,
              ),
            };
          }
          return { lines: [...state.lines, { ...item, quantity: 1 }] };
        }),

      remove: (itemId) =>
        set((state) => ({ lines: state.lines.filter((line) => line.itemId !== itemId) })),

      setQuantity: (itemId, quantity) =>
        set((state) => ({
          lines:
            quantity <= 0
              ? state.lines.filter((line) => line.itemId !== itemId)
              : state.lines.map((line) => (line.itemId === itemId ? { ...line, quantity } : line)),
        })),

      enterTableMode: (tableCode) => set({ mode: "table", tableCode }),
      setMode: (mode) => set({ mode, tableCode: mode === "table" ? get().tableCode : null }),
      clear: () => set({ lines: [] }),
      total: () => get().lines.reduce((sum, line) => sum + line.price * line.quantity, 0),
    }),
    { name: "aicafe-cart" },
  ),
);
