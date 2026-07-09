// «Повторить заказ»: кладёт снапшот состава прошлого заказа в корзину.
// Названия и актуальные цены берём из текущего меню; исчезнувшие или
// стоп-листовые позиции пропускаем и честно говорим об этом.
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import type { components } from "../../api/schema";
import { useMenu } from "../../pages/Menu";
import { useCart } from "../cart/store";

type AccountOrder = components["schemas"]["AccountOrder"];

export function RepeatOrderButton({ order }: { order: AccountOrder }) {
  const navigate = useNavigate();
  const addLines = useCart((state) => state.addLines);
  const { data: menu } = useMenu();
  const [skippedNote, setSkippedNote] = useState<string | null>(null);

  const repeat = () => {
    if (!menu) return;
    const catalog = new Map(
      menu.categories.flatMap((c) => c.items).map((item) => [item.id, item]),
    );
    const lines = [];
    let skipped = 0;
    for (const line of order.items) {
      const dish = catalog.get(line.item_id);
      if (!dish || dish.in_stop_list) {
        skipped += 1;
        continue;
      }
      lines.push({
        itemId: dish.id,
        name: dish.name,
        price: dish.price,
        quantity: line.quantity,
      });
    }
    if (lines.length === 0) {
      setSkippedNote("Увы, этих блюд сейчас нет в меню.");
      return;
    }
    addLines(lines);
    if (skipped > 0) {
      setSkippedNote(`Добавили, но ${skipped} позиции сейчас нет — проверьте корзину.`);
      setTimeout(() => navigate("/cart"), 1200);
      return;
    }
    navigate("/cart");
  };

  return (
    <span>
      <button onClick={repeat}>Повторить</button>
      {skippedNote && <span className="form-hint"> {skippedNote}</span>}
    </span>
  );
}
