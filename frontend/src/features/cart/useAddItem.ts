// Единая точка «добавить в корзину»: в обычных режимах — локальная корзина,
// за столом — общая серверная корзина стола (все гости видят друг друга).
import { useCart } from "./store";
import { useTableCart } from "./useTableCart";

export function useAddItem() {
  const { mode, tableCode, guestName, add } = useCart();
  const isTable = mode === "table" && Boolean(tableCode);
  const { cart, update } = useTableCart(isTable ? tableCode : null);

  return (item: { itemId: string; name: string; price: number }) => {
    if (!isTable) {
      add(item);
      return;
    }
    const guest = guestName.trim() || "Гость";
    const existing = cart?.lines.find(
      (line) => line.item_id === item.itemId && line.guest === guest,
    );
    update.mutate({
      item_id: item.itemId,
      quantity: (existing?.quantity ?? 0) + 1,
      guest,
    });
  };
}
