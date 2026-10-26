#!/usr/bin/env bash
# Восстановление сайта из бэкапа (база + загруженные файлы) на этом сервере.
# Используется при переезде на новый сервер или после сбоя.
#   bash /opt/site/scripts/restore.sh /root/db_2026-10-26_0300.dump /root/media_2026-10-26_0300.tar.gz
# ВНИМАНИЕ: текущие данные сайта на этом сервере будут заменены данными из бэкапа.
set -euo pipefail

DB_DUMP="${1:-}"
MEDIA_TGZ="${2:-}"
[ -f "$DB_DUMP" ] && [ -f "$MEDIA_TGZ" ] || { echo "Использование: bash scripts/restore.sh <db_*.dump> <media_*.tar.gz>"; exit 1; }

cd /opt/site
echo "Это заменит данные сайта на этом сервере данными из бэкапа."
read -r -p "Продолжить? Введите yes: " OK
[ "$OK" = "yes" ] || { echo "Отменено."; exit 1; }

echo "==> Останавливаю приложение"
docker compose stop app
docker compose up -d db
until docker compose exec -T db pg_isready -U site -d site >/dev/null 2>&1; do sleep 2; done

echo "==> Восстанавливаю базу"
docker compose exec -T db psql -U site -d postgres -v ON_ERROR_STOP=1 -c "DROP DATABASE IF EXISTS site WITH (FORCE);"
docker compose exec -T db psql -U site -d postgres -v ON_ERROR_STOP=1 -c "CREATE DATABASE site OWNER site;"
docker compose exec -T db pg_restore -U site -d site --no-owner --no-privileges < "$DB_DUMP"

echo "==> Восстанавливаю загруженные файлы"
docker run --rm -v site_media:/media -v "$(dirname "$(readlink -f "$MEDIA_TGZ")")":/in alpine sh -c "rm -rf /media/* /media/.[!.]* 2>/dev/null; tar xzf /in/$(basename "$MEDIA_TGZ") -C /media"

echo "==> Запускаю сайт"
docker compose up -d
for i in $(seq 1 30); do
  if curl -fsS http://127.0.0.1:3000/api/public/health >/dev/null 2>&1; then echo "Сайт работает."; exit 0; fi
  sleep 4
done
echo "Сайт не ответил за 2 минуты. Смотрите: docker compose logs app --tail 80"
exit 1
