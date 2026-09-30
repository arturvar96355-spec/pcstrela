#!/usr/bin/env bash
# Ежедневный бэкап базы и загруженных файлов. Запуск: bash /opt/site/scripts/backup.sh
# Cron: 0 3 * * * bash /opt/site/scripts/backup.sh >> /var/log/site-backup.log 2>&1
set -euo pipefail
cd /opt/site
TS=$(date +%F_%H%M)
DIR=/opt/backups
mkdir -p "$DIR"

docker compose exec -T db pg_dump -U site -d site -Fc > "$DIR/db_$TS.dump"
docker run --rm -v site_media:/media -v "$DIR":/out alpine tar czf "/out/media_$TS.tar.gz" -C /media .

# храним 14 дней
find "$DIR" -type f -mtime +14 -delete
echo "backup ok: $TS"

# Проверка восстановления (сделать один раз до запуска):
#   docker compose exec -T db createdb -U site site_restore_test
#   docker compose exec -T db pg_restore -U site -d site_restore_test < /opt/backups/db_<дата>.dump
#   docker compose exec -T db dropdb -U site site_restore_test
