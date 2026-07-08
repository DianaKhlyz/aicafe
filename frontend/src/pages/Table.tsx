// Режим «за столом»: QR на столе ведёт на /t/{code}.
// Общая корзина стола: все гости наполняют один заказ со своих телефонов
// и видят изменения друг друга в реальном времени (SSE).
// Здесь же появятся: вызов официанта, счёт и split-оплата (фаза 2).
import { useEffect } from "react";
import { useParams } from "react-router-dom";
import { TableCartPanel } from "../features/cart/TableCartPanel";
import { useCart } from "../features/cart/store";
import { MenuPage } from "./Menu";

export function TablePage() {
  const { tableCode } = useParams<{ tableCode: string }>();
  const { enterTableMode, guestName, setGuestName } = useCart();

  useEffect(() => {
    if (tableCode) enterTableMode(tableCode);
  }, [tableCode, enterTableMode]);

  if (!tableCode) return null;

  return (
    <div>
      <p className="table-banner">
        Вы за столом {tableCode}. Заказ общий на стол — все за столом видят его со своих
        телефонов.
      </p>
      <label className="form-field guest-name">
        Ваше имя (видно компании за столом)
        <input
          type="text"
          placeholder="Гость"
          value={guestName}
          onChange={(event) => setGuestName(event.target.value)}
        />
      </label>
      <TableCartPanel tableCode={tableCode} />
      <MenuPage />
    </div>
  );
}
