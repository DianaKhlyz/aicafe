import type { Metadata } from "next";

export const metadata: Metadata = { title: "Акции" };

/**
 * Витрина акций. Фаза 2: акции ведутся в контент-админке, а механики
 * (скидки, купоны) считает iikoCard через loyalty/calculate.
 */
const demoPromos = [
  {
    emoji: "🥐",
    title: "Завтрак + кофе = −20%",
    text: "Каждый день до 12:00 любой завтрак с любым кофе дешевле на 20%.",
  },
  {
    emoji: "🎂",
    title: "Десерт в день рождения",
    text: "Покажите документ — любой десерт из витрины в подарок (±3 дня).",
  },
  {
    emoji: "🛵",
    title: "Бесплатная доставка от 1500 ₽",
    text: "Соберите заказ от 1500 ₽ — привезём за наш счёт.",
  },
];

export default function PromoPage() {
  return (
    <div>
      <h1 className="mb-6 text-3xl font-bold">Акции</h1>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {demoPromos.map((promo) => (
          <article
            key={promo.title}
            className="rounded-card border border-line bg-surface p-5"
          >
            <div className="mb-3 text-4xl">{promo.emoji}</div>
            <h2 className="mb-1 font-semibold">{promo.title}</h2>
            <p className="text-sm text-muted">{promo.text}</p>
          </article>
        ))}
      </div>
    </div>
  );
}
