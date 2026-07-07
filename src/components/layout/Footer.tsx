import Link from "next/link";
import { cafe } from "@/lib/config";

export function Footer() {
  return (
    <footer className="mt-16 border-t border-line bg-surface">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 text-sm sm:grid-cols-3">
        <div>
          <div className="mb-2 font-bold text-brand">{cafe.name}</div>
          <p className="text-muted">{cafe.address}</p>
          <p className="text-muted">{cafe.workHours}</p>
          <p className="mt-2 font-medium">{cafe.phone}</p>
        </div>
        <div className="flex flex-col gap-2">
          <Link href="/menu" className="text-muted hover:text-brand">Меню</Link>
          <Link href="/promo" className="text-muted hover:text-brand">Акции</Link>
          <Link href="/booking" className="text-muted hover:text-brand">Бронь стола</Link>
          <Link href="/about" className="text-muted hover:text-brand">Доставка и контакты</Link>
        </div>
        <div className="flex flex-col gap-2">
          <Link href="/legal/offer" className="text-muted hover:text-brand">
            Публичная оферта
          </Link>
          <Link href="/legal/privacy" className="text-muted hover:text-brand">
            Политика обработки персональных данных
          </Link>
          <p className="mt-2 text-xs text-muted">
            © {new Date().getFullYear()} {cafe.name}
          </p>
        </div>
      </div>
    </footer>
  );
}
