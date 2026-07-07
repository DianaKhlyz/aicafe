"use client";

import { useState } from "react";
import { cafe } from "@/lib/config";

/**
 * Бронирование стола — фаза 0: форма-заявка (уходит менеджеру).
 * Фаза 2: свободные столы из резервов iiko
 * (reserve/available_restaurant_sections + reserve/create), депозит онлайн.
 */
export default function BookingPage() {
  const [sent, setSent] = useState(false);

  if (sent) {
    return (
      <div className="mx-auto max-w-md py-16 text-center">
        <div className="mb-4 text-5xl">✅</div>
        <h1 className="mb-2 text-2xl font-bold">Заявка принята</h1>
        <p className="text-muted">
          Мы позвоним и подтвердим бронь в течение 15 минут.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md">
      <h1 className="mb-2 text-3xl font-bold">Бронь стола</h1>
      <p className="mb-6 text-sm text-muted">
        {cafe.address} · {cafe.workHours}
      </p>
      <form
        className="flex flex-col gap-3 rounded-card border border-line bg-surface p-5"
        onSubmit={(e) => {
          e.preventDefault();
          setSent(true); // фаза 2: POST в резервы iiko
        }}
      >
        <input className="field" placeholder="Имя" required />
        <input className="field" placeholder="Телефон, +7..." type="tel" required />
        <div className="grid grid-cols-2 gap-3">
          <input className="field" type="date" required />
          <input className="field" type="time" required />
        </div>
        <select className="field" defaultValue="2" aria-label="Число гостей">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <option key={n} value={n}>
              {n} {n === 1 ? "гость" : n < 5 ? "гостя" : "гостей"}
            </option>
          ))}
          <option value="7+">Больше 6 (банкет)</option>
        </select>
        <textarea className="field" placeholder="Пожелания (необязательно)" rows={2} />
        <button type="submit" className="btn-primary">
          Забронировать
        </button>
      </form>
    </div>
  );
}
