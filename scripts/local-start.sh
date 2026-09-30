#!/usr/bin/env bash
# Запуск сайта локально одной командой: bash scripts/local-start.sh
# Делает всё сам: проверяет Node и pnpm, поднимает базу, создаёт .env, ставит зависимости,
# загружает начальные данные и запускает сайт на http://localhost:3000
set -euo pipefail
cd "$(dirname "$0")/.."

say() { printf '\n\033[1m==> %s\033[0m\n' "$1"; }
die() { printf '\n\033[31mОШИБКА: %s\033[0m\n' "$1" >&2; exit 1; }

# 1. Node.js 22+
command -v node >/dev/null || die "Не найден Node.js. Установите версию 22 с https://nodejs.org и запустите скрипт снова."
[ "$(node -p 'process.versions.node.split(".")[0]')" -ge 22 ] || die "Нужен Node.js 22 или новее (сейчас $(node -v)). Обновите: https://nodejs.org"

# 2. pnpm
if ! command -v pnpm >/dev/null; then
  say "Устанавливаю pnpm"
  (corepack enable && corepack prepare pnpm@latest --activate) 2>/dev/null || npm install -g pnpm || die "Не удалось поставить pnpm. Выполните: npm install -g pnpm"
fi

# 3. файл настроек .env (создаётся один раз)
node scripts/make-env.mjs

# 4. база данных: если на порту 5432 уже кто-то отвечает — используем её, иначе поднимаем через Docker
db_up() { node scripts/db-up.mjs; }
if ! db_up; then
  command -v docker >/dev/null || die "Не найден Docker. Установите Docker Desktop (https://www.docker.com/products/docker-desktop), запустите его и повторите."
  docker info >/dev/null 2>&1 || die "Docker установлен, но не запущен. Откройте Docker Desktop, дождитесь зелёного значка и повторите."
  say "Запускаю базу данных"
  docker compose -f docker-compose.dev.yml up -d
  for i in $(seq 1 60); do db_up && break; sleep 1; done
  db_up || die "База данных не запустилась за 60 секунд. Посмотрите: docker compose -f docker-compose.dev.yml logs"
  sleep 3
fi

# 5. зависимости, водяной знак, начальные данные
say "Устанавливаю зависимости (первый раз — несколько минут)"
pnpm install
say "Создаю водяной знак"
pnpm watermark
say "Загружаю начальные данные и фото"
pnpm seed

[ "${NO_DEV:-}" = "1" ] && { say "Готово (режим NO_DEV)"; exit 0; }

cat <<'MSG'

================================================================
  Сайт:     http://localhost:3000
  Админка:  http://localhost:3000/admin
  Вход:     admin@localhost.local  /  admin-local-12345
  Остановить: Ctrl+C
================================================================
MSG
exec pnpm dev
