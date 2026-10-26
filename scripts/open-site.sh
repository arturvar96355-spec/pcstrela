#!/usr/bin/env bash
# Открывает сайт для поисковиков: убирает заголовок noindex (и пароль на входе, если он стоял).
# Запуск на сервере: bash /opt/site/scripts/open-site.sh
set -euo pipefail
cd /opt/site
rm -f gate/gate.caddy
docker compose restart caddy
echo "Сайт открыт для поисковиков. Проверка: curl -sI https://\$(grep ^SITE_DOMAIN .env | cut -d= -f2) | grep -i x-robots (строки быть не должно)"
