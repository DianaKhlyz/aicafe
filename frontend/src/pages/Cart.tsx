import { Link } from "react-router-dom";
import { TableCartPanel } from "../features/cart/TableCartPanel";
import { useCart } from "../features/cart/store";

export function CartPage() {
  const { lines, setQuantity, remove, total, mode, tableCode } = useCart();

  // За столом корзина общая и живёт на сервере
  if (mode === "table" && tableCode) {
    return (
      <div>
        <h1>Корзина · стол {tableCode}</h1>
        <TableCartPanel tableCode={tableCode} />
        <p>
          <Link to={`/t/${tableCode}`}>← К меню стола</Link>
        </p>
      </div>
    );
  }

  if (lines.length === 0) {
    return (
      <div>
        <h1>Корзина</h1>
        <p>
          Пока пусто. <Link to="/menu">Посмотреть меню</Link>
        </p>
      </div>
    );
  }

  return (
    <div>
      <h1>Корзина</h1>
      <ul className="cart-lines">
        {lines.map((line) => (
          <li key={line.itemId}>
            <span>{line.name}</span>
            <span className="cart-qty">
              <button onClick={() => setQuantity(line.itemId, line.quantity - 1)}>−</button>
              {line.quantity}
              <button onClick={() => setQuantity(line.itemId, line.quantity + 1)}>+</button>
            </span>
            <span>{line.price * line.quantity} ₽</span>
            <button onClick={() => remove(line.itemId)}>Убрать</button>
          </li>
        ))}
      </ul>
      <p className="cart-total">Итого: {total()} ₽</p>
      <Link to="/checkout" className="button-primary">
        Оформить заказ
      </Link>
    </div>
  );
}
