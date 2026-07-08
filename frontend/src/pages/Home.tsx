// Главная-витрина: хиты из меню (тег «хит» приходит из iiko),
// быстрые действия. Блок «повторить прошлый заказ» появится вместе
// с личным кабинетом.
import { Link } from "react-router-dom";
import { useAddItem } from "../features/cart/useAddItem";
import { useMenu } from "./Menu";

export function HomePage() {
  const { data: menu } = useMenu();
  const addToCart = useAddItem();

  const hits = (menu?.categories ?? [])
    .flatMap((category) => category.items)
    .filter((item) => item.tags.includes("хит") && !item.in_stop_list)
    .slice(0, 4);

  return (
    <div>
      <section className="hero">
        <h1>Кафе, в котором ждут</h1>
        <p>Доставим горячим, соберём к вашему приходу или накроем ваш стол.</p>
        <div className="cta-row">
          <Link to="/menu" className="button-primary">
            Смотреть меню
          </Link>
          <Link to="/booking" className="button-secondary">
            Забронировать стол
          </Link>
          <Link to="/delivery" className="button-secondary">
            Условия доставки
          </Link>
        </div>
      </section>

      {hits.length > 0 && (
        <section>
          <h2>Хиты</h2>
          <ul className="menu-grid">
            {hits.map((item) => (
              <li key={item.id} className="dish">
                <h3>
                  <Link to={`/menu/${item.id}`}>{item.name}</Link>
                </h3>
                <p>{item.description}</p>
                <footer>
                  <span className="dish-price">{item.price} ₽</span>
                  <button
                    onClick={() =>
                      addToCart({ itemId: item.id, name: item.name, price: item.price })
                    }
                  >
                    В корзину
                  </button>
                </footer>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
