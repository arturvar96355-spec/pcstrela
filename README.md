# Сайт ООО «ПК Стрела»

Next.js 16 + Payload CMS 3 (админка `/admin`) + PostgreSQL 16. Подробное ТЗ: `docs/SPEC.md`, принятые решения и отличия от ТЗ: `docs/DECISIONS.md`, запуск на сервере и передача заказчику: `docs/SETUP.md`.

## Локальный запуск

1. Нужны Node.js 22, pnpm и PostgreSQL 16.
2. База: `docker compose -f docker-compose.dev.yml up -d` (или свой PostgreSQL с пользователем `site`, паролем `site_dev`, базой `site`).
3. Настройки: `cp .env.example .env`, затем подставьте локальные значения (`NODE_ENV=development`, `NEXT_PUBLIC_SITE_URL=http://localhost:3000`, `PAYLOAD_SECRET` любая длинная строка, `DATABASE_URI=postgres://site:site_dev@127.0.0.1:5432/site`, `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD`).
4. `pnpm install`
5. `pnpm watermark` (создаёт `public/watermark.png`), `pnpm seed` (начальные данные и фото).
6. `pnpm dev` → сайт http://localhost:3000, админка http://localhost:3000/admin.

## Команды

| Команда | Что делает |
|---|---|
| `pnpm dev` / `pnpm build` / `pnpm start` | Разработка, сборка, запуск |
| `pnpm typecheck` / `pnpm lint` / `pnpm test` | Проверки |
| `pnpm generate:types` | Обновить `src/payload-types.ts` после изменения коллекций |
| `pnpm payload migrate:create <имя>` | Создать миграцию после изменения коллекций |
| `pnpm seed` | Начальные данные (можно запускать повторно) |

## Важно помнить

- Контакты, реквизиты, цифры и гарантия хранятся только в «Настройках сайта». В коде их писать нельзя.
- Данные для страниц читаются только через `src/lib/queries.ts`: там отфильтрованы черновики.
- Каждый раз, когда меняется структура коллекций, создавайте миграцию и коммитьте её.
- Раз в год (декабрь) проверять даты документов с истекающим сроком в админке.
