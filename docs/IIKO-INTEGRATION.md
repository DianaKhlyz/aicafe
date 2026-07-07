# Интеграция с iiko

Работаем с **iikoCloud API** (он же ex-iikoTransport), базовый URL
`https://api-ru.iiko.services`. Это официальный публичный API для доставки,
меню, лояльности и резервов. Для него в тарифе iiko должен быть включён
API-модуль — уточнить у своего менеджера iiko при подключении.

## Авторизация

```
POST /api/1/access_token  { "apiLogin": "<секретный ключ>" }
→ { "token": "..." }      живёт ~1 час
```

`apiLogin` выдаётся в личном кабинете iiko. Токен кэшируем на бэкенде
(~55 минут) и обновляем заранее — не запрашиваем на каждый запрос.
Дальше все вызовы с заголовком `Authorization: Bearer <token>`.

## Идентификаторы, которые понадобятся в .env

| Что | Откуда |
|---|---|
| `IIKO_API_LOGIN` | ЛК iiko → API |
| `IIKO_ORGANIZATION_ID` | `POST /api/1/organizations` |
| `IIKO_TERMINAL_GROUP_ID` | `POST /api/1/terminal_groups` |

## Карта endpoint → фича сайта

| Фича | Endpoint'ы iikoCloud |
|---|---|
| Меню | `POST /api/1/nomenclature` (номенклатура: категории, блюда, модификаторы, размеры) или внешнее меню `POST /api/2/menu` + `/api/2/menu/by_id` (если ведём отдельное веб-меню в iikoWeb) |
| Стоп-лист | `POST /api/1/stop_lists` + вебхук `StopListUpdate` |
| Создание заказа на доставку/самовывоз | `POST /api/1/deliveries/create` |
| Контроль доставки заказа в кассу | `POST /api/1/commands/status` (по `correlationId`; статусы `InProgress / Success / Error`) |
| Статусы заказа | вебхук `DeliveryOrderUpdate` (`Unconfirmed → WaitCooking → CookingStarted → CookingCompleted → Waiting → OnWay → Delivered → Closed`, отмена — `Cancelled`) |
| Отмена/изменение | `POST /api/1/deliveries/cancel` и родственные |
| Зоны доставки | настройки организации / `POST /api/1/delivery_restrictions` (+ проверка адреса `.../allowed`) |
| Типы оплат | `POST /api/1/payment_types` (нужен id типа «онлайн-оплата», чтобы заказ падал в кассу оплаченным) |
| Бронь столов | `POST /api/1/reserve/available_restaurant_sections` (схема зала), `POST /api/1/reserve/create` |
| Заказ за столом (QR) | `POST /api/1/order/create` с указанием стола |
| Гости | `POST /api/1/loyalty/iiko/customer/info`, `.../customer/create_or_update` |
| Бонусы/лояльность | `POST /api/1/loyalty/iiko/*`: программы, баланс кошелька, начисление/списание, `calculate` (расчёт акций по корзине) |
| Купоны/промокоды | `POST /api/1/loyalty/iiko/coupons/*` |

Точные контракты сверяем с актуальной документацией
(https://api-ru.iiko.services/ → Swagger) на этапе подключения — в коде каркаса
эндпоинты собраны в одном месте (`src/lib/iiko/cloud/client.ts`).

## Вебхуки

Настраиваются через `POST /api/1/webhooks/update_settings` на наш
`/api/webhooks/iiko`. Используем:

- `DeliveryOrderUpdate` / `DeliveryOrderError` — статусы и ошибки заказов →
  обновление БД → живой трекер, алерты менеджеру.
- `StopListUpdate` — мгновенное скрытие блюд.
- `ReserveUpdate` — статусы броней (фаза 2).

Требования к обработчику: отвечать 200 быстро (обработка асинхронно),
идемпотентность (события могут дублироваться), проверка `authToken` из
настроек вебхука, всё сырое — в `event_log`.

## Правила вежливости к API

- Токен — кэшируем; номенклатуру — не чаще раза в несколько минут (есть
  `revision` для проверки изменений); у iiko есть rate limits.
- Всё, что нужно сайту постоянно (меню, статусы), храним у себя; iiko дёргаем
  по событиям и по расписанию, а не на каждый запрос гостя.
- `deliveries/create` асинхронный: успех HTTP ≠ заказ в кассе. Обязательно
  подтверждаем через `commands/status`, иначе можно потерять заказ молча.

## Деградация при недоступности iiko

- Меню: отдаётся из кэша (последняя успешная версия).
- Заказ: фаза 1 — честное сообщение «примите заказ по телефону»;
  фаза 2 — очередь заказов с ретраями и алертом менеджеру.
- Трекер: показывает последний известный статус с пометкой времени.
