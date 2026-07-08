import { Link, useParams } from "react-router-dom";
import { useCart } from "../features/cart/store";
import { useMenu } from "./Menu";

export function DishPage() {
  const { dishId } = useParams<{ dishId: string }>();
  const addToCart = useCart((state) => state.add);
  const { data: menu, isPending } = useMenu();

  if (isPending) return <p>Загружаем…</p>;

  const item = menu?.categories.flatMap((category) => category.items).find(
    (candidate) => candidate.id === dishId,
  );
  if (!item) {
    return (
      <div>
        <h1>Блюдо не найдено</h1>
        <Link to="/menu">К меню</Link>
      </div>
    );
  }

  return (
    <article className="dish-card">
      <Link to="/menu">← Меню</Link>
      {/* Фото придёт из внешнего меню iiko и будет кэшироваться локально */}
      {item.image_url && <img src={item.image_url} alt={item.name} />}
      <h1>{item.name}</h1>
      <p>{item.description}</p>
      {item.tags.length > 0 && <p className="dish-tags">{item.tags.join(" · ")}</p>}

      {item.nutrition && (
        <table className="nutrition-table">
          <caption>Пищевая ценность на порцию</caption>
          <tbody>
            <tr>
              <td>Калории</td>
              <td>{item.nutrition.kcal} ккал</td>
            </tr>
            <tr>
              <td>Белки</td>
              <td>{item.nutrition.proteins} г</td>
            </tr>
            <tr>
              <td>Жиры</td>
              <td>{item.nutrition.fats} г</td>
            </tr>
            <tr>
              <td>Углеводы</td>
              <td>{item.nutrition.carbs} г</td>
            </tr>
          </tbody>
        </table>
      )}

      {item.allergens.length > 0 && (
        <p className="dish-allergens">Аллергены: {item.allergens.join(", ")}</p>
      )}

      <footer className="dish-card-footer">
        <span className="dish-price">{item.price} ₽</span>
        {item.in_stop_list ? (
          <span className="dish-stopped-label">Закончилось</span>
        ) : (
          <button
            onClick={() => addToCart({ itemId: item.id, name: item.name, price: item.price })}
          >
            В корзину
          </button>
        )}
      </footer>
    </article>
  );
}
