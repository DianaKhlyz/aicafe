# Деплой: от чистого VPS до работающего сайта за ~15 минут

Целевая конфигурация (см. [docs/architecture.md](../docs/architecture.md)):
один VPS в РФ (~2 vCPU / 2 ГБ), один Python-процесс под systemd, Caddy
с автоматическим HTTPS, SQLite-файл, статика фронтенда. Регулярные
затраты — только VPS и домен.

## Предварительно

1. VPS с Ubuntu 22.04/24.04 и root-доступом.
2. Домен с A-записью, указывающей на IP сервера (HTTPS Caddy получит сам).

## Установка

```bash
ssh root@СЕРВЕР
git clone https://github.com/DianaKhlyz/aicafe.git /opt/aicafe
/opt/aicafe/deploy/setup.sh кафе-домен.ru
```

Скрипт идемпотентен (можно перезапускать), ставит Node 22, uv и Caddy,
создаёт системного пользователя `aicafe`, собирает фронтенд, включает
systemd-юнит и настраивает Caddy на домен.

После установки заполните `/opt/aicafe/backend/.env`:

| Переменная | Значение |
|---|---|
| `AICAFE_IIKO_MOCK` | `true` до получения apiLogin, потом `false` |
| `AICAFE_IIKO_API_LOGIN` | apiLogin от дилера iiko |
| `AICAFE_IIKO_ORGANIZATION_IDS` | `["<uuid организации>"]` |
| `AICAFE_DADATA_API_KEY` | ключ DaData (без него — мок-подсказки) |

и перезапустите бэкенд: `systemctl restart aicafe`.

## Обновление версии

```bash
/opt/aicafe/deploy/update.sh
```

(git pull → зависимости → сборка фронта → рестарт. Откат: `git checkout
<коммит>` в /opt/aicafe и тот же скрипт.)

## Бэкапы БД — Litestream (опционально, включается позже)

Без него сайт работает; включить стоит перед боевым запуском:

1. Завести S3-совместимое хранилище (любой провайдер, ~0–150 ₽/мес).
2. Установить Litestream: <https://litestream.io/install/debian/>
3. Заполнить `deploy/litestream.yml` и скопировать в `/etc/litestream.yml`.
4. `systemctl enable --now litestream`

Восстановление после сбоя — одна команда `litestream restore`.

## Важные особенности

- **Один воркер uvicorn — это не случайность.** SSE-шина, кэш меню и
  корзины столов живут в памяти процесса. Кафе один процесс держит
  с большим запасом; путь масштабирования (Redis pub/sub) описан
  в `backend/app/events.py` и понадобится только сети точек.
- Проверка здоровья: `curl https://домен/api/health` →
  `{"status":"ok","iiko_mode":"mock"}`.
- Логи: `journalctl -u aicafe -f` (бэкенд), `journalctl -u caddy -f` (веб).
