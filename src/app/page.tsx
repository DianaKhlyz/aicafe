import Link from "next/link";
import { cafe } from "@/lib/config";
import { getIikoClient } from "@/lib/iiko";
import { ProductCard } from "@/components/menu/ProductCard";

/** Меню обновляется фоном каждые 5 минут (ISR) — iiko не нагружаем */
export const revalidate = 300;

export default async function HomePage() {
  const menu = await getIikoClient().getMenu();
  const hits = menu.products
    .filter((p) => !p.stopped && p.tags.includes("хит"))
    .slice(0, 4);

  return (
    <div className="flex flex-col gap-12">
      {/* Hero */}
      <section className="rounded-card bg-brand-soft px-6 py-12 text-center sm:py-16">
        <h1 className="mx-auto max-w-2xl text-3xl font-bold sm:text-4xl">
          {cafe.tagline}
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-muted">
          Заказ падает прямо на кухню, статус — в реальном времени. Доставка от{" "}
          {cafe.delivery.minOrder} ₽, бесплатно от {cafe.delivery.freeFrom} ₽.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Link href="/menu" className="btn-primary px-8 py-3 text-base">
            Заказать
          </Link>
          <Link href="/booking" className="btn-secondary px-8 py-3 text-base">
            Забронировать стол
          </Link>
        </div>
      </section>

      {/* Хиты */}
      <section>
        <div className="mb-4 flex items-baseline justify-between">
          <h2 className="text-2xl font-bold">Хиты</h2>
          <Link href="/menu" className="text-sm font-medium text-brand">
            Всё меню →
          </Link>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {hits.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </section>

      {/* Условия доставки */}
      <section className="grid gap-4 sm:grid-cols-3">
        {[
          {
            title: `~${cafe.delivery.etaMinutes} минут`,
            text: "среднее время доставки, готовим сразу после оплаты",
          },
          {
            title: `от ${cafe.delivery.freeFrom} ₽ — бесплатно`,
            text: `доставка ${cafe.delivery.fee} ₽ при заказе от ${cafe.delivery.minOrder} ₽`,
          },
          {
            title: cafe.workHours,
            text: `${cafe.address} · самовывоз без очереди`,
          },
        ].map((card) => (
          <div
            key={card.title}
            className="rounded-card border border-line bg-surface p-5"
          >
            <div className="text-lg font-bold text-brand">{card.title}</div>
            <p className="mt-1 text-sm text-muted">{card.text}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
