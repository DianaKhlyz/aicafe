import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import { useAddItem } from "../features/cart/useAddItem";
import { useSSE } from "../shared/useSSE";

export function useMenu() {
  return useQuery({
    queryKey: ["menu"],
    queryFn: async () => {
      const { data, error } = await api.GET("/api/menu");
      if (error) throw error;
      return data;
    },
  });
}

export function MenuPage() {
  const queryClient = useQueryClient();
  const addToCart = useAddItem();

  const [search, setSearch] = useState("");
  const [activeTags, setActiveTags] = useState<string[]>([]);
  const [excludedAllergens, setExcludedAllergens] = useState<string[]>([]);

  const { data: menu, isPending } = useMenu();

  // Вебхук StopListUpdate на бэке -> SSE -> блюдо гаснет без перезагрузки
  const onStopList = useCallback(
    () => queryClient.invalidateQueries({ queryKey: ["menu"] }),
    [queryClient],
  );
  useSSE("stoplist", onStopList);

  // Все теги и аллергены собираются из самого меню (источник — iiko)
  const { allTags, allAllergens } = useMemo(() => {
    const tags = new Set<string>();
    const allergens = new Set<string>();
    for (const category of menu?.categories ?? []) {
      for (const item of category.items) {
        item.tags.forEach((tag) => tags.add(tag));
        item.allergens.forEach((allergen) => allergens.add(allergen));
      }
    }
    return { allTags: [...tags].sort(), allAllergens: [...allergens].sort() };
  }, [menu]);

  const toggle = (list: string[], value: string) =>
    list.includes(value) ? list.filter((v) => v !== value) : [...list, value];

  const matches = (item: {
    name: string;
    description: string;
    tags: string[];
    allergens: string[];
  }) => {
    const query = search.trim().toLowerCase();
    if (query && !`${item.name} ${item.description}`.toLowerCase().includes(query)) return false;
    if (activeTags.length > 0 && !activeTags.every((tag) => item.tags.includes(tag))) return false;
    if (item.allergens.some((allergen) => excludedAllergens.includes(allergen))) return false;
    return true;
  };

  if (isPending) return <p>Загружаем меню…</p>;
  if (!menu) return <p>Меню временно недоступно</p>;

  const visibleCategories = menu.categories
    .map((category) => ({ ...category, items: category.items.filter(matches) }))
    .filter((category) => category.items.length > 0);

  return (
    <div className="menu">
      <h1>Меню</h1>

      <div className="menu-filters">
        <input
          type="search"
          placeholder="Поиск по меню"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        {allTags.length > 0 && (
          <div className="chip-row">
            {allTags.map((tag) => (
              <button
                key={tag}
                className={activeTags.includes(tag) ? "chip chip--active" : "chip"}
                onClick={() => setActiveTags((current) => toggle(current, tag))}
              >
                {tag}
              </button>
            ))}
          </div>
        )}
        {allAllergens.length > 0 && (
          <details className="allergen-filter">
            <summary>
              Исключить аллергены
              {excludedAllergens.length > 0 ? ` (${excludedAllergens.length})` : ""}
            </summary>
            <div className="chip-row">
              {allAllergens.map((allergen) => (
                <button
                  key={allergen}
                  className={
                    excludedAllergens.includes(allergen) ? "chip chip--excluded" : "chip"
                  }
                  onClick={() =>
                    setExcludedAllergens((current) => toggle(current, allergen))
                  }
                >
                  {allergen}
                </button>
              ))}
            </div>
          </details>
        )}
      </div>

      {visibleCategories.length === 0 && <p>Ничего не нашлось — попробуйте убрать фильтры.</p>}

      {visibleCategories.map((category) => (
        <section key={category.id}>
          <h2>{category.name}</h2>
          <ul className="menu-grid">
            {category.items.map((item) => (
              <li key={item.id} className={item.in_stop_list ? "dish dish--stopped" : "dish"}>
                <h3>
                  <Link to={`/menu/${item.id}`}>{item.name}</Link>
                </h3>
                <p>{item.description}</p>
                {item.tags.length > 0 && <p className="dish-tags">{item.tags.join(" · ")}</p>}
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
