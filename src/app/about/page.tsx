import type { Metadata } from "next";
import { cafe } from "@/lib/config";

export const metadata: Metadata = { title: "О нас и доставка" };

export default function AboutPage() {
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <h1 className="text-3xl font-bold">О нас</h1>
      <p className="text-muted">
        {cafe.name} — кафе у дома: свежая выпечка каждое утро, спешелти-кофе и
        честные обеды. Этот текст, как и всё содержимое страницы, редактируется
        в админке (фаза 2).
      </p>

      <section className="rounded-card border border-line bg-surface p-5">
        <h2 className="mb-3 text-xl font-bold">Контакты</h2>
        <p>{cafe.address}</p>
        <p className="text-muted">{cafe.workHours}</p>
        <p className="mt-2 font-semibold">{cafe.phone}</p>
        {/* фаза 1: карта (Яндекс.Карты виджет) + зона доставки полигоном */}
        <div className="mt-4 flex h-48 items-center justify-center rounded-card bg-brand-soft text-muted">
          Здесь будет карта с зоной доставки
        </div>
      </section>

      <section className="rounded-card border border-line bg-surface p-5">
        <h2 className="mb-3 text-xl font-bold">Доставка</h2>
        <ul className="flex flex-col gap-1 text-sm text-muted">
          <li>• Минимальный заказ — {cafe.delivery.minOrder} ₽</li>
          <li>
            • Доставка {cafe.delivery.fee} ₽, бесплатно от {cafe.delivery.freeFrom} ₽
          </li>
          <li>• Среднее время — {cafe.delivery.etaMinutes} минут</li>
          <li>• Самовывоз — без минимальной суммы, готовим к вашему приходу</li>
        </ul>
      </section>
    </div>
  );
}
