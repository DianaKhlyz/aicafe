import type { Metadata } from "next";

export const metadata: Metadata = { title: "Публичная оферта" };

export default function OfferPage() {
  return (
    <div className="prose mx-auto max-w-2xl">
      <h1 className="mb-4 text-3xl font-bold">Публичная оферта</h1>
      <p className="text-muted">
        Шаблон-заглушка. Перед запуском (фаза 1) сюда ложится договор публичной
        оферты, подготовленный юристом: реквизиты юрлица/ИП, порядок заказа и
        оплаты, условия доставки, возвраты по ЗоЗПП.
      </p>
    </div>
  );
}
