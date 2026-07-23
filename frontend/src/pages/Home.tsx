// Главная-витрина: дышащий герой (пузырьки + ботанический мотив обоев),
// хиты из меню и «повторить прошлый заказ». Витрина, а не каталог —
// стоп-состояний тут нет: впечатление, что есть всё, что захочется.
import { Link } from "react-router-dom";
import { useAuth, useOrderHistory } from "../features/auth/useAuth";
import { RepeatOrderButton } from "../features/auth/RepeatOrderButton";
import { DishCard } from "../features/cart/DishCard";
import { HeroBubbles } from "../features/home/HeroBubbles";
import { useMenu } from "./Menu";

function RepeatLastOrder() {
  const { me } = useAuth();
  const history = useOrderHistory(Boolean(me));
  const last = history.data?.[0];
  if (!me || !last) return null;
  return (
    <section className="repeat-last">
      <h2>Как обычно?</h2>
      <p>
        Прошлый заказ на {last.amount} ₽ <RepeatOrderButton order={last} />
      </p>
    </section>
  );
}

export function HomePage() {
  const { data: menu } = useMenu();

  const hits = (menu?.categories ?? [])
    .flatMap((category) => category.items)
    .filter((item) => item.tags.includes("хит") && !item.in_stop_list)
    .slice(0, 3);

  return (
    <div>
      <section className="hero">
        <HeroBubbles />
        <span className="hero-glow" />
        <span className="hero-flora" />
        <div className="hero-inner">
          <span className="eyebrow">Мясной гастропаб · крафтовое пиво</span>
          <h1>
            По-домашнему
            <br />и <em>всегда вкусно</em>
          </h1>
          <p className="hero-lead">
            Сытные блюда из смокера, холодное пиво на кранах и большой стол для всей семьи.
            Приходите как есть — Вам здесь всегда рады.
          </p>
          <div className="cta-row">
            <Link to="/menu" className="button-primary">
              Смотреть меню
            </Link>
            <Link to="/booking" className="button-secondary">
              Забронировать стол
            </Link>
          </div>
          <div className="hero-meta">
            <div>
              <b className="tnum">12</b>
              <span>сортов на кранах</span>
            </div>
            <div>
              <b>от 45 мин</b>
              <span>доставка по городу</span>
            </div>
            <div>
              <b>−10%</b>
              <span>на самовывоз</span>
            </div>
          </div>
        </div>
      </section>

      <RepeatLastOrder />

      {hits.length > 0 && (
        <section>
          <div className="sec-head">
            <span className="eyebrow">Наше меню</span>
            <h2>То, ради чего возвращаются</h2>
          </div>
          <ul className="menu-grid">
            {hits.map((item, i) => (
              <DishCard key={item.id} item={item} index={i} />
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
