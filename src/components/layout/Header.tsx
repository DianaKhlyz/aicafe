"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { cafe, features } from "@/lib/config";
import { cartCount, cartTotal, useCart } from "@/store/cart";

const nav = [
  { href: "/menu", label: "Меню" },
  { href: "/promo", label: "Акции" },
  ...(features.booking ? [{ href: "/booking", label: "Бронь стола" }] : []),
  { href: "/about", label: "О нас" },
];

export function Header() {
  const lines = useCart((s) => s.lines);
  // корзина хранится в localStorage — рендерим счётчик только после
  // гидратации, чтобы серверная и клиентская разметка совпадали
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const count = mounted ? cartCount(lines) : 0;
  const total = mounted ? cartTotal(lines) : 0;

  return (
    <header className="sticky top-0 z-20 border-b border-line bg-surface/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-6 px-4">
        <Link href="/" className="text-lg font-bold text-brand">
          {cafe.name}
        </Link>

        <nav className="hidden gap-5 text-sm font-medium md:flex">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-muted transition-colors hover:text-brand"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-4">
          <a
            href={`tel:${cafe.phone.replace(/[^+\d]/g, "")}`}
            className="hidden text-sm font-medium text-muted hover:text-brand lg:block"
          >
            {cafe.phone}
          </a>
          <Link href="/account" className="btn-secondary hidden sm:inline-flex">
            Войти
          </Link>
          <Link href="/cart" className="btn-primary">
            🛒 {count > 0 ? `${count} · ${total} ₽` : "Корзина"}
          </Link>
        </div>
      </div>

      {/* мобильная навигация */}
      <nav className="flex gap-4 overflow-x-auto border-t border-line px-4 py-2 text-sm md:hidden">
        {nav.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="whitespace-nowrap text-muted"
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
