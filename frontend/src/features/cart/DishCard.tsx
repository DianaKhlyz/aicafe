// Карточка блюда: живой наклон всей карточки за курсором (текст остаётся
// чётким — карточка наклоняется целиком, углы не торчат), штамп-бирдекель
// «хит», пивной пейринг на ховере, стоп-состояние. Наклон только на
// десктопе с мышью и при разрешённой анимации.
import type { CSSProperties, PointerEvent } from "react";
import { useRef } from "react";
import { Link } from "react-router-dom";
import type { components } from "../../api/schema";
import { flyToCart } from "./fly";
import { phClass } from "./ph";
import { useAddItem } from "./useAddItem";

type MenuItem = components["schemas"]["MenuItem"];

const canTilt =
  typeof window !== "undefined" &&
  window.matchMedia("(hover: hover) and (pointer: fine)").matches &&
  !window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function BeerIcon() {
  return (
    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="#e7cfa4" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 3h8l-1 9a3 3 0 0 1-6 0z" />
      <path d="M14 6h3a2 2 0 0 1 0 4h-2" />
      <path d="M8 21h6" />
    </svg>
  );
}

export function DishCard({ item, index = 0 }: { item: MenuItem; index?: number }) {
  const addToCart = useAddItem();
  const ref = useRef<HTMLLIElement>(null);
  const raf = useRef<number | null>(null);
  const stopped = item.in_stop_list;
  const isHit = item.tags.includes("хит");
  const otherTags = item.tags.filter((t) => t !== "хит");

  const onMove = (e: PointerEvent<HTMLLIElement>) => {
    if (!canTilt || stopped) return;
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const rx = -(((e.clientY - r.top) / r.height) - 0.5) * 4.5;
    const ry = (((e.clientX - r.left) / r.width) - 0.5) * 5.5;
    if (raf.current == null) {
      raf.current = requestAnimationFrame(() => {
        el.style.transition = "none";
        el.style.transform = `perspective(900px) rotateX(${rx.toFixed(2)}deg) rotateY(${ry.toFixed(2)}deg) translateY(-4px)`;
        raf.current = null;
      });
    }
  };
  const onLeave = () => {
    if (raf.current != null) {
      cancelAnimationFrame(raf.current);
      raf.current = null;
    }
    const el = ref.current;
    if (!el) return;
    el.style.transition = "";
    el.style.transform = "";
  };

  return (
    <li
      ref={ref}
      className={stopped ? "dish dish--stopped" : "dish"}
      style={{ "--i": index } as CSSProperties}
      onPointerMove={onMove}
      onPointerLeave={onLeave}
    >
      <div className="dish-photo">
        {isHit && !stopped && <span className="coaster stamp">хит</span>}
        {item.image_url ? (
          <img src={item.image_url} alt={item.name} />
        ) : (
          <span className={`ph ${phClass(item.id)}`} />
        )}
        {stopped && <span className="dish-out">Закончилось</span>}
        {item.pairing && !stopped && (
          <div className="pair">
            <BeerIcon />
            {item.pairing}
          </div>
        )}
      </div>
      <div className="dish-body">
        <h3>
          <Link to={`/menu/${item.id}`}>{item.name}</Link>
        </h3>
        <p>{item.description}</p>
        {(otherTags.length > 0 || item.nutrition) && (
          <div className="dish-meta">
            {otherTags.map((t) => (
              <span key={t} className="tagx">
                {t}
              </span>
            ))}
            {item.nutrition && <span>{item.nutrition.kcal} ккал</span>}
          </div>
        )}
        <div className="dish-row">
          <span className="price-mat tnum">{item.price.toLocaleString("ru-RU")}</span>
          {stopped ? (
            <span className="dish-out-label">Нет в наличии</span>
          ) : (
            <button
              className="add"
              onClick={(e) => {
                addToCart({ itemId: item.id, name: item.name, price: item.price });
                flyToCart(e.currentTarget);
              }}
            >
              + в корзину
            </button>
          )}
        </div>
      </div>
    </li>
  );
}
