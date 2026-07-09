#!/usr/bin/env bash
# Обновление сайта до свежей версии из git. Запуск от root: ./update.sh
set -euo pipefail

APP_DIR=/opt/aicafe

cd "$APP_DIR"
sudo -u aicafe git pull --ff-only

cd "$APP_DIR/backend" && sudo -u aicafe /usr/local/bin/uv sync --frozen
cd "$APP_DIR/frontend" && sudo -u aicafe npm ci --no-audit --no-fund && sudo -u aicafe npm run build

# Обновить юниты/конфиги, если менялись в репозитории
cp "$APP_DIR/deploy/aicafe.service" /etc/systemd/system/aicafe.service
systemctl daemon-reload
systemctl restart aicafe
systemctl reload caddy

sleep 2
curl -fsS http://127.0.0.1:8000/api/health && echo
echo "Обновлено."
