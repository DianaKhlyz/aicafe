# AI Cafe — сайт кафе с интеграцией iiko

Стартовая основа сайта кафе: заказ блюд на доставку и самовывоз, онлайн-оплата,
живой трекер заказа, лояльность и бронирование столов. Построено так, чтобы после
согласования дизайна оставалось только сверстать макет по готовым дизайн-токенам
и подключить боевые ключи iiko и эквайринга.

## Документация

| Документ | Что внутри |
|---|---|
| [docs/CONCEPT.md](docs/CONCEPT.md) | Концепция, фичи для гостей и персонала, «вау-фичи» |
| [docs/SITE-STRUCTURE.md](docs/SITE-STRUCTURE.md) | Карта сайта, страницы, состояния |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Архитектура, потоки данных, модель данных, деплой |
| [docs/IIKO-INTEGRATION.md](docs/IIKO-INTEGRATION.md) | Карта интеграции с iikoCloud API |
| [docs/ROADMAP.md](docs/ROADMAP.md) | Этапы разработки и критерии готовности |

## Быстрый старт

```bash
npm install
npm run dev
```

Сайт поднимется на http://localhost:3000 в **mock-режиме**: меню, корзина,
оформление заказа и трекер работают на демо-данных без ключей iiko и интернета.

## Режимы работы

Режим задаётся переменной `IIKO_MODE` (см. `.env.example`):

- `mock` (по умолчанию) — демо-меню и эмуляция жизненного цикла заказа.
  Для разработки, вёрстки макета и демонстраций.
- `cloud` — боевой iikoCloud API (нужны `IIKO_API_LOGIN`, `IIKO_ORGANIZATION_ID`,
  `IIKO_TERMINAL_GROUP_ID`). Клиент-заготовка: `src/lib/iiko/cloud/client.ts`.

Оплата аналогично: `PAYMENT_PROVIDER=mock | yookassa`.

## Стек

- **Next.js (App Router) + TypeScript** — SSR/ISR для мгновенного меню и SEO,
  API-роуты как бэкенд-прослойка (BFF) к iiko.
- **Tailwind CSS v4** — дизайн-токены в `src/app/globals.css` (`@theme`),
  под замену на палитру дизайнера.
- **Zustand** — корзина с сохранением в localStorage.
- **Zod** — валидация заказов на входе в API.

## Структура кода

```
src/
├── app/              # страницы (App Router) и API-роуты
│   └── api/          # BFF: /api/menu, /api/orders, /api/webhooks/*
├── components/       # UI-компоненты (layout, menu, order)
├── lib/
│   ├── config.ts     # фичефлаги и настройки заведения
│   ├── iiko/         # интерфейс IikoClient: mock + заготовка iikoCloud
│   ├── payments/     # интерфейс PaymentProvider: mock + заготовка ЮKassa
│   └── orders/       # in-memory зеркало заказов (до подключения БД)
└── store/            # состояние корзины
```
