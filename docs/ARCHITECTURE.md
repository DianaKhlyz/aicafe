# Архитектура

## Общая схема

```
 Гость (браузер)                     Персонал
      │                                  │
      ▼                                  ▼
┌─────────────────────────────────────────────────┐
│  Next.js (один деплой)                          │
│                                                 │
│  Страницы (SSR/ISR)          /admin             │
│      │                                          │
│      ▼                                          │
│  API-роуты = BFF                                │
│  /api/menu ──────── кэш меню (revalidate)       │
│  /api/orders ────── создание/статус заказа      │
│  /api/webhooks/* ── приём вебхуков              │
└────────┬───────────────┬────────────────┬───────┘
         │               │                │
         ▼               ▼                ▼
   iikoCloud API    Эквайринг       PostgreSQL
   (меню, заказы,   (ЮKassa/СБП)    (зеркало заказов,
   стоп-листы,                       гости, отзывы,
   лояльность)                       контент)
                                          │
                              Telegram Bot API (алерты)
```

Ключевое правило: **браузер никогда не ходит в iiko напрямую** — apiLogin это
секрет, у iiko есть rate limits, и внешняя зависимость не должна влиять на
скорость сайта. Всё через BFF.

## Поток: меню

1. Синк-джоба (cron раз в 10–15 минут + ручная кнопка в админке) забирает
   номенклатуру из iiko, мёржит с контентом админки (фото, порядок, теги)
   и кладёт в кэш.
2. Вебхук `StopListUpdate` мгновенно помечает позиции «в стопе» и инвалидирует
   кэш.
3. Страницы меню рендерятся из кэша (ISR) — время ответа не зависит от iiko.

## Поток: заказ

```
чекаут → POST /api/orders
  1. zod-валидация, пересчёт суммы ПО ДАННЫМ СЕРВЕРА (цены клиента не доверяем)
  2. запись заказа в БД (status=created)
  3а. оплата онлайн: createPayment() → редирект гостя на страницу оплаты
      → вебхук оплаты → шаг 4
  3б. оплата при получении → сразу шаг 4
  4. deliveries/create в iiko → сохранить correlationId
  5. подтверждение доставки заказа в кассу через commands/status
     (Success → заказ на кухне; Error → алерт менеджеру + гостю «мы перезвоним»)
  6. вебхуки DeliveryOrderUpdate обновляют статус в БД
  7. трекер /order/[id] читает статус из НАШЕЙ БД (не из iiko) — поллинг/SSE
```

Оплата строго до отправки в iiko: заказ в кассу падает уже оплаченным
(тип оплаты «онлайн»), кухня начинает готовить без ожидания.

## Слои интеграций

Обе внешние системы спрятаны за интерфейсами с двумя реализациями:

- `IikoClient` → `MockIikoClient` (демо-данные, эмуляция статусов) и
  `CloudIikoClient` (боевой iikoCloud). Выбор — `IIKO_MODE=mock|cloud`.
- `PaymentProvider` → `MockPaymentProvider` и `YooKassaProvider`
  (`PAYMENT_PROVIDER=mock|yookassa`). ЮKassa выбрана как заготовка: виджет,
  СБП, чеки 54-ФЗ на её стороне; интерфейс позволяет заменить на T-Bank /
  CloudPayments без правок остального кода.

Mock-режим — полноценная среда разработки: вёрстка, дизайн, демо инвестору —
всё работает без единого ключа.

## Модель данных (PostgreSQL, фаза 1)

```
orders        id(uuid), number, status, fulfillment(delivery|pickup),
              customer_name, phone, address(jsonb), items(jsonb),
              total, payment_status, payment_id,
              iiko_order_id, iiko_correlation_id, error(jsonb),
              created_at, updated_at
users         id, phone(uniq), name, iiko_customer_id, created_at
addresses     id, user_id, label, address(jsonb)
reviews       id, order_id(uniq), rating, comment, published, created_at
content       key(uniq), value(jsonb)          -- баннеры, тексты, настройки
menu_meta     product_id(uniq), photo_url, sort, tags[], hidden
event_log     id, kind, payload(jsonb), created_at   -- вебхуки, ошибки, синки
```

В каркасе (фаза 0) вместо БД — in-memory стор с тем же интерфейсом
(`src/lib/orders/store.ts`), чтобы не тащить инфраструктуру раньше времени.

## Нефункциональные требования

- **Скорость**: меню из ISR-кэша; изображения через `next/image`; целевой LCP
  на мобильном < 2.5 с.
- **152-ФЗ**: персональные данные граждан РФ храним на серверах в РФ → хостинг
  VPS в РФ (Docker + docker-compose: next + postgres + caddy). Политика
  конфиденциальности и согласие на обработку ПД — страницы `/legal/*`.
- **54-ФЗ**: чеки формирует эквайринг (у ЮKassa — встроенная фискализация) либо
  iikoFront при оплате на месте.
- **Надёжность**: вебхуки идемпотентны (проверка по ключу события); отправка
  в iiko с ретраями; все ошибки интеграции — в `event_log` + алерт в Telegram.
- **Безопасность**: секреты только в env; подпись вебхуков эквайринга
  проверяется; номер телефона подтверждается кодом; id заказа — uuid.

## Фичефлаги

`src/lib/config.ts` — единая точка: `delivery`, `pickup`, `tableBooking`,
`loyalty`, `preorder`, `qrTable`, `reviews`. Флаги читаются из env, чтобы
включать фичи по мере готовности без деплоя кода.
