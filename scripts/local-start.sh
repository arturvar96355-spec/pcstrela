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

# 4. зависимости
say "Устанавливаю зависимости (первый раз — несколько минут)"
pnpm install

# 5. база (своя, Docker или встроенная), данные и запуск сайта
exec node scripts/local-run.mjs
