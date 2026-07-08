import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import { api } from "../api/client";
import { useCart } from "../features/cart/store";
import { useSSE } from "../shared/useSSE";

export function MenuPage() {
  const queryClient = useQueryClient();
  const addToCart = useCart((state) => state.add);

  const { data: menu, isPending } = useQuery({
    queryKey: ["menu"],
    queryFn: async () => {
      const { data, error } = await api.GET("/api/menu");
      if (error) throw error;
      return data;
    },
  });

  // Вебхук StopListUpdate на бэке -> SSE -> блюдо гаснет без перезагрузки
  const onStopList = useCallback(
    () => queryClient.invalidateQueries({ queryKey: ["menu"] }),
    [queryClient],
  );
  useSSE("stoplist", onStopList);

  if (isPending) return <p>Загружаем меню…</p>;
  if (!menu) return <p>Меню временно недоступно</p>;

  return (
    <div className="menu">
      <h1>Меню</h1>
      {menu.categories.map((category) => (
        <section key={category.id}>
          <h2>{category.name}</h2>
          <ul className="menu-grid">
            {category.items.map((item) => (
              <li key={item.id} className={item.in_stop_list ? "dish dish--stopped" : "dish"}>
                <h3>{item.name}</h3>
                <p>{item.description}</p>
                {item.tags.length > 0 && (
                  <p className="dish-tags">{item.tags.join(" · ")}</p>
                )}
                {item.nutrition && <p className="dish-kcal">{item.nutrition.kcal} ккал</p>}
                <footer>
                  <span className="dish-price">{item.price} ₽</span>
                  {item.in_stop_list ? (
                    <span className="dish-stopped-label">Закончилось</span>
                  ) : (
                    <button
                      onClick={() =>
                        addToCart({ itemId: item.id, name: item.name, price: item.price })
                      }
                    >
                      В корзину
                    </button>
                  )}
                </footer>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
