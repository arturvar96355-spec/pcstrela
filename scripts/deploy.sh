#!/usr/bin/env bash
# Обновление сайта на сервере: bash /opt/site/scripts/deploy.sh
set -euo pipefail
cd /opt/site
git pull --ff-only
docker compose up -d --build
docker image prune -f >/dev/null
echo "Сайт обновлён."
