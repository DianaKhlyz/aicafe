// Режим «за столом»: QR на столе ведёт на /t/{code}.
// Тот же каталог и корзина, но чекаут пойдёт по ветке «за столом».
// Здесь же появятся: общая корзина стола (SSE), вызов официанта, счёт.
import { useEffect } from "react";
import { useParams } from "react-router-dom";
import { useCart } from "../features/cart/store";
import { MenuPage } from "./Menu";

export function TablePage() {
  const { tableCode } = useParams<{ tableCode: string }>();
  const enterTableMode = useCart((state) => state.enterTableMode);

  useEffect(() => {
    if (tableCode) enterTableMode(tableCode);
  }, [tableCode, enterTableMode]);

  return (
    <div>
      <p className="table-banner">Вы за столом {tableCode}. Заказ приедет прямо сюда.</p>
      <MenuPage />
    </div>
  );
}
