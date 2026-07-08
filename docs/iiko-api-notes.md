# iiko Transport API — проверенные факты

Дата проверки: 2026-07-08. Официальный портал (api-ru.iiko.services/docs)
не отдаёт содержимое не-браузерным клиентам, поэтому структура взята из
типов, **сгенерированных из официальной OpenAPI-схемы iiko** (пакет
[@salesduck/iiko-cloud-api](https://github.com/salesduck/iiko-cloud-api),
13 тыс. строк типов), с перекрёстной сверкой по Go-клиенту
[iiko-go](https://pkg.go.dev/github.com/themgmd/iiko-go). Структура
запросов/ответов — фактическая; **поведение** сверим на песочнице.

Аутентификация: `POST /api/1/access_token` с `apiLogin` → токен (кэшируем
в памяти, живёт ~1 час).

## Соответствие наших фич эндпоинтам (всё подтверждено схемой API)

### Меню и стоп-листы
- `POST /api/2/menu`, `/api/2/menu/by_id` — внешнее меню:
  - категория (`TransportMenuCategoryDto`): name, description,
    `buttonImageUrl`, `headerImageUrl` — **у категорий есть свои картинки**;
  - блюдо (`TransportItemDto`): name, description, sku,
    **`allergenGroups`**, схема модификаторов, тип Product/Compound;
  - размер порции (`TransportItemSizeDto`): цены,
    **`nutritionPerHundredGrams`** (КБЖУ), `portionWeightGrams`,
    **`buttonImageUrl` + `buttonImageCroppedUrl`** (готовые кропы),
    группы модификаторов (`restrictions`, `canBeDivided`, min/max/free
    quantity) — конструктор блюд полностью обеспечен данными.
- `POST /api/1/stop_lists` — стоп-листы, элемент содержит **`balance`**
  (остаток) — можно показывать «осталось 2 порции», не только «нет».

### Доставка
- `deliveries/create` + **`deliveries/check_create`** — валидация заказа
  без создания: проверяем адрес/состав ДО оплаты, а не после.
- `deliveries/change_complete_before` (перенос времени), `cancel`,
  `confirm`, `close`, `update_order_payments`, `change_payments`.
- **`deliveries/by_delivery_date_and_phone`** — история заказов по
  телефону прямо из iiko: «повтор заказа» не требует своей истории.
- `deliveries/by_delivery_date_and_status` — источник для расчёта ETA
  (счётчик активных заказов).

### Зоны доставки
- `/api/2/delivery_restrictions` + `/allowed`: зона = полигон
  `coordinates[]` (+ адресные привязки). Наша модель point-in-polygon
  совпадает с моделью iiko 1:1.

### Бронь столов — план А подтверждён
- `reserve/available_restaurant_sections` с **`returnSchema: true`**
  возвращает полную схему зала (`SectionSchema`): размеры холста в px,
  **`tableElements`** (tableId, x, y, z, angle, width, height),
  `rectangleElements`/`ellipseElements` (стены, стойки — декор зала),
  `markElements` (подписи). Стол: id, number, name, `seatingCapacity`.
  → **Заказчик редактирует зал в iiko, сайт рендерит один в один,
  включая декорации. Мини-редактор (план Б) не нужен.**
- **`reserve/restaurant_sections_workload`** (dateFrom/dateTo) — занятость
  залов на интервал времени: доступность столов по слотам — из коробки.
- `reserve/create` (durationInMinutes, tableIds, phone, comment),
  `reserve/status_by_id`. Статусы отмены: ClientNotAppeared,
  ClientRefused, Other.

### Заказы за столом (QR-режим)
- `order/create` с `tableIds`; **`order/by_table`** — текущий заказ стола;
  **`order/add_items`** — дозаказ к существующему заказу (групповой заказ
  «волнами»: гости дозаказывают в течение вечера);
  `order/update_payments`, `order/close`, `init_by_table`.

### Платежи — split подтверждён на уровне схемы
- Заказ принимает **массив** `payments[]`: `paymentTypeId`, `sum`,
  `processingType: External | Internal`. Плюс `update_payments` /
  `change_payments` для добавления платежей к существующему заказу.
- `payment_types` — справочник типов оплаты; **`tips_types`** — чаевые
  как отдельная сущность iiko.
- На песочнице проверяем только поведение: закрытие заказа несколькими
  External-платежами по частям.

### Вебхуки — настраиваются через API
- `webhooks/settings` + `webhooks/update_settings`, фильтры:
  `deliveryOrderFilter`, **`tableOrderFilter`** (события заказов на
  столах!), `reserveFilter`, `stopListUpdateFilter`, personalShift.
  → Подписку на события настраиваем сами кодом, без дилера.

### Лояльность (iikoCard) — обширнее ожиданий
- `loyalty/iiko/*`: программы, кошельки (**hold / chargeoff / topup** —
  списание и начисление бонусов), купоны и серии купонов, категории
  гостей, `customer/create_or_update`, `calculate` (расчёт акций для
  корзины), `manual_condition`, рассылки `message/send_sms|send_email`.

### Комбо
- `combo`, `combo/calculate` — комбо-наборы и расчёт цены.

## Что остаётся проверить на песочнице (поведение, не структура)

1. Закрытие заказа несколькими External-платежами по частям (split).
2. Фактические тела вебхуков (поля eventInfo) и задержки доставки.
3. Лимиты запросов (rate limits) — в схеме не описаны.
4. Коды столов для QR: в API стол имеет id/number/name; наши QR-ссылки
   `/t/{code}` можем генерировать сами на table id — не зависит от iiko.
5. `NutritionInfoDto` в типах пустой (`Record<string, never>`) — состав
   полей КБЖУ уточнить на реальном ответе.
6. Поведение `restaurant_sections_workload` с пересекающимися бронями.
