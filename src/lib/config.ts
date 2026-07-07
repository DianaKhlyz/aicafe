/**
 * Единая точка конфигурации: данные заведения и фичефлаги.
 *
 * Флаги позволяют включать функциональность по мере готовности (см. ROADMAP.md)
 * без правок кода — через переменные окружения FEATURE_*.
 */

function flag(env: string | undefined, fallback: boolean): boolean {
  if (env === undefined) return fallback;
  return env === "true" || env === "1";
}

export const cafe = {
  name: "AI Cafe",
  tagline: "Кофе, завтраки и обеды — с доставкой и предзаказом",
  phone: "+7 (900) 000-00-00",
  address: "г. Москва, ул. Пушкина, 1",
  workHours: "ежедневно 8:00–22:00",
  delivery: {
    fee: 199,
    freeFrom: 1500,
    minOrder: 500,
    etaMinutes: 45,
  },
} as const;

export const features = {
  delivery: true,
  pickup: true,
  booking: flag(process.env.FEATURE_BOOKING, true),
  loyalty: flag(process.env.FEATURE_LOYALTY, false),
  preorder: flag(process.env.FEATURE_PREORDER, false),
  qrTable: flag(process.env.FEATURE_QR_TABLE, false),
  reviews: flag(process.env.FEATURE_REVIEWS, false),
} as const;

export const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
