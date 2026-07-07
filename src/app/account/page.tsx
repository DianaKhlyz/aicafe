import type { Metadata } from "next";

export const metadata: Metadata = { title: "Личный кабинет" };

/**
 * Заглушка ЛК. Фаза 1: вход по телефону (код через Telegram Gateway /
 * flash call), история заказов с повтором, адреса.
 * Фаза 2: бонусы iikoCard + карта в Apple/Google Wallet.
 */
export default function AccountPage() {
  return (
    <div className="mx-auto max-w-md py-8 text-center">
      <div className="mb-4 text-5xl">👤</div>
      <h1 className="mb-2 text-2xl font-bold">Личный кабинет</h1>
      <p className="mb-8 text-muted">
        Вход по номеру телефона появится в фазе 1. Здесь будут: история заказов
        с повтором в один клик, сохранённые адреса, бонусы и карта лояльности
        в Apple/Google Wallet.
      </p>
      <form className="flex flex-col gap-3 rounded-card border border-line bg-surface p-5 text-left opacity-60">
        <input className="field" placeholder="+7 (___) ___-__-__" disabled />
        <button type="button" className="btn-primary" disabled>
          Получить код (скоро)
        </button>
      </form>
    </div>
  );
}
