#!/usr/bin/env bash
# Первичная настройка чистого VPS (Ubuntu 22.04/24.04) под сайт кафе.
# Запуск от root:  ./setup.sh кафе-домен.ru [url-репозитория]
# Повторный запуск безопасен (шаги идемпотентны).
set -euo pipefail

DOMAIN="${1:?Использование: ./setup.sh домен.ru [url-репозитория]}"
REPO="${2:-https://github.com/DianaKhlyz/aicafe.git}"
APP_DIR=/opt/aicafe

echo "== Базовые пакеты"
apt-get update -q
apt-get install -yq git curl ca-certificates debian-keyring debian-archive-keyring apt-transport-https

echo "== Node 22 (сборка фронтенда)"
if ! command -v node >/dev/null 2>&1; then
    curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
    apt-get install -yq nodejs
fi

echo "== uv (Python-окружение бэкенда)"
if [ ! -x /usr/local/bin/uv ]; then
    curl -LsSf https://astral.sh/uv/install.sh | env UV_INSTALL_DIR=/usr/local/bin sh
fi

echo "== Caddy (веб-сервер, HTTPS автоматически)"
if ! command -v caddy >/dev/null 2>&1; then
    curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' \
        | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
    curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' \
        > /etc/apt/sources.list.d/caddy-stable.list
    apt-get update -q
    apt-get install -yq caddy
fi

echo "== Пользователь и код"
id -u aicafe >/dev/null 2>&1 || useradd --system --create-home --shell /usr/sbin/nologin aicafe
if [ ! -d "$APP_DIR/.git" ]; then
    git clone "$REPO" "$APP_DIR"
fi
chown -R aicafe:aicafe "$APP_DIR"

echo "== Конфиг бэкенда (.env)"
if [ ! -f "$APP_DIR/backend/.env" ]; then
    cp "$APP_DIR/.env.example" "$APP_DIR/backend/.env"
    chown aicafe:aicafe "$APP_DIR/backend/.env"
    echo "   Создан backend/.env из примера — проверьте значения!"
fi

echo "== Зависимости и сборка"
cd "$APP_DIR/backend" && sudo -u aicafe /usr/local/bin/uv sync --frozen
cd "$APP_DIR/frontend" && sudo -u aicafe npm ci --no-audit --no-fund && sudo -u aicafe npm run build

echo "== systemd и Caddy"
cp "$APP_DIR/deploy/aicafe.service" /etc/systemd/system/aicafe.service
sed "s/example\.ru/$DOMAIN/" "$APP_DIR/deploy/Caddyfile" > /etc/caddy/Caddyfile
systemctl daemon-reload
systemctl enable --now aicafe
systemctl reload caddy

echo "== Проверка"
sleep 2
curl -fsS http://127.0.0.1:8000/api/health && echo
echo "Готово: https://$DOMAIN (DNS A-запись должна указывать на этот сервер)."
echo "Бэкапы БД (опционально): см. deploy/README.md, раздел Litestream."
