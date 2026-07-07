import type { Metadata } from "next";

export const metadata: Metadata = { title: "Политика обработки персональных данных" };

export default function PrivacyPage() {
  return (
    <div className="prose mx-auto max-w-2xl">
      <h1 className="mb-4 text-3xl font-bold">
        Политика обработки персональных данных
      </h1>
      <p className="text-muted">
        Шаблон-заглушка. Перед запуском (фаза 1) сюда ложится политика по
        152-ФЗ: какие данные собираем (имя, телефон, адрес), цели, сроки
        хранения, оператор ПД. Данные граждан РФ храним на серверах в РФ;
        не забыть уведомление в Роскомнадзор об обработке ПД.
      </p>
    </div>
  );
}
