#!/usr/bin/env bash
# Первая настройка нового сервера (Ubuntu 24.04) одной командой. Запускать от root:
#   apt-get update && apt-get install -y git && git clone https://github.com/arturvar96355-spec/pcstrela.git /opt/site && bash /opt/site/scripts/server-setup.sh
# Скрипт можно запускать повторно: уже сделанное он пропускает.
set -euo pipefail

DOMAIN="${DOMAIN:-pcstrela.ru}"
BRANCH="${BRANCH:-claude/new-session-lp9lw3}"
DIR=/opt/site

say() { printf '\n\033[1m==> %s\033[0m\n' "$1"; }
die() { printf '\n\033[31mОШИБКА: %s\033[0m\n' "$1" >&2; exit 1; }
rand() { openssl rand -hex "$1"; }

[ "$(id -u)" = 0 ] || die "Запустите от root (если вы не root, добавьте sudo перед командой)."
[ -d "$DIR/.git" ] || die "Код не найден в $DIR. Сначала выполните: git clone https://github.com/arturvar96355-spec/pcstrela.git $DIR"

say "Обновляю систему и ставлю нужное"
export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get upgrade -y
apt-get install -y git curl ufw openssl ca-certificates

say "Файрвол: открываю только SSH, HTTP и HTTPS"
ufw allow 22/tcp >/dev/null
ufw allow 80/tcp >/dev/null
ufw allow 443/tcp >/dev/null
ufw --force enable

if ! command -v docker >/dev/null; then
  say "Устанавливаю Docker"
  curl -fsSL https://get.docker.com | sh
fi
docker compose version >/dev/null || die "Docker Compose не установлен"

cd "$DIR"
say "Подтягиваю код ($BRANCH)"
git fetch origin "$BRANCH"
git checkout "$BRANCH"
git pull --ff-only origin "$BRANCH"

if [ ! -f .env ]; then
  say "Создаю настройки .env"
  echo "Придумайте логин и пароль для входа в админку сайта (пароль от 12 символов)."
  read -r -p "Email для входа в админку: " ADMIN_EMAIL
  read -r -s -p "Пароль (не показывается при вводе): " ADMIN_PASS; echo
  [ "${#ADMIN_PASS}" -ge 12 ] || die "Пароль короче 12 символов. Запустите скрипт снова."
  umask 077
  cat > .env <<ENV
NODE_ENV=production
SITE_DOMAIN=$DOMAIN
NEXT_PUBLIC_SITE_URL=https://$DOMAIN
NEXT_PUBLIC_COMPANY_SHORT=ПК Стрела
PAYLOAD_SECRET=$(rand 32)
POSTGRES_PASSWORD=$(rand 24)
SMTP_USER=
SMTP_PASS=
SMTP_FROM=
SMTP_FROM_NAME=Сайт ПК Стрела
TELEGRAM_BOT_TOKEN=
WATERMARK_TEXT=ПК Стрела
SEED_ADMIN_EMAIL=$ADMIN_EMAIL
SEED_ADMIN_PASSWORD=$ADMIN_PASS
SEED_COMPANY_NAME=ООО «ПК Стрела»
SEED_COMPANY_EMAIL=
SEED_NOTIFY_EMAIL=$ADMIN_EMAIL
ENV
  chmod 600 .env
fi

if [ ! -f gate/gate.caddy ]; then
  say "Временный вход на весь сайт (пока сайт не готов для публики)"
  read -r -p "Логин для входа на сайт: " GATE_USER
  read -r -s -p "Пароль для входа на сайт: " GATE_PASS; echo
  [ -n "$GATE_USER" ] && [ -n "$GATE_PASS" ] || die "Логин и пароль не должны быть пустыми."
  HASH=$(docker run --rm caddy:2-alpine caddy hash-password --plaintext "$GATE_PASS")
  mkdir -p gate
  printf 'basic_auth {\n\t%s %s\n}\nheader X-Robots-Tag "noindex, nofollow"\n' "$GATE_USER" "$HASH" > gate/gate.caddy
fi

say "Собираю и запускаю сайт (первый раз 5–15 минут)"
docker compose up -d --build

say "Загружаю начальные данные"
docker compose --profile tools run --rm --build seed

say "Готово"
echo "Проверьте: https://$DOMAIN (попросит логин и пароль входа на сайт), админка: https://$DOMAIN/admin"
echo "Состояние: docker compose ps | Логи: docker compose logs app --tail 100"
