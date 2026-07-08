// Панель общей корзины стола: кто что добавил, изменение количества,
// итог и переход к оформлению. Используется на странице стола и в корзине.
import { Link } from "react-router-dom";
import { useCart } from "./store";
import { useTableCart } from "./useTableCart";

export function TableCartPanel({ tableCode }: { tableCode: string }) {
  const guestName = useCart((state) => state.guestName);
  const { cart, update } = useTableCart(tableCode);

  if (!cart || cart.lines.length === 0) {
    return <p className="form-hint">Корзина стола пока пуста — выбирайте из меню ниже.</p>;
  }

  const setQuantity = (line: { item_id: string; guest: string }, quantity: number) =>
    update.mutate({ item_id: line.item_id, quantity, guest: line.guest });

  return (
    <div className="table-cart">
      <h2>Общий заказ стола</h2>
      <ul className="cart-lines">
        {cart.lines.map((line) => (
          <li key={`${line.item_id}:${line.guest}`}>
            <span>
              {line.name}
              <span className="cart-guest">
                {line.guest === (guestName.trim() || "Гость") ? "вы" : line.guest}
              </span>
            </span>
            <span className="cart-qty">
              <button onClick={() => setQuantity(line, line.quantity - 1)}>−</button>
              {line.quantity}
              <button onClick={() => setQuantity(line, line.quantity + 1)}>+</button>
            </span>
            <span>{line.price * line.quantity} ₽</span>
          </li>
        ))}
      </ul>
      <p className="cart-total">Итого стол: {cart.total} ₽</p>
      <Link to="/checkout" className="button-primary">
        Оформить заказ стола
      </Link>
    </div>
  );
}
