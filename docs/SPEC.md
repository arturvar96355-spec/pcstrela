# Сайт производителя МАФ, металлоконструкций и инженерных систем — Техническая спецификация

> Версия: 1.0 | Дата: 2026-09-30 | Статус: Production-ready
> Источник требований: PROJECT_IDEA.md (2026-09-30), ответы клиента на бриф, анализ конкурентов (ecomaf.ru, adanatgroup.ru, mpromaf.ru)

---

## Как читать этот документ (для Claude Code)

1. Этот документ — единственный источник истины. Если в коде нужно решение, которого здесь нет, выбирай самый простой вариант, совместимый с разделами 0 и 5, и добавь запись в `docs/DECISIONS.md`.
2. Шаблон курса предполагает Supabase + Vercel. Для этого проекта стек заменён (обоснование в 0.2). Там, где шаблон требует SQL и RLS, здесь даны конфигурации коллекций Payload CMS (схема БД генерируется миграциями Payload) и правила `access` (эквивалент RLS).
3. Название компании, домен и логотип клиент ещё не прислал. Во всём коде они берутся из глобала `site-settings` и переменных окружения. Жёстко прописывать название компании в коде запрещено.
4. Язык интерфейса сайта и админки — только русский.

---

## 0. Обзор проекта

### 0.1 Что это
Многостраничный корпоративный сайт с каталогом для производственной компании (МАФ, уличная мебель, противопожарные двери, фасадные системы, тепловые узлы, шумозащитные кожухи, проектирование котельных). Задача сайта — чтобы госзаказчик или генподрядчик за 2–3 минуты проверил компанию (реквизиты, документы, объекты), нашёл изделие с характеристиками для техзадания и отправил запрос КП. Контент редактирует сам клиент через админку.

### 0.2 Стек

| Слой | Технология | Версия | Примечание |
|---|---|---|---|
| Фреймворк | Next.js (App Router), TypeScript | 16.x | Если последняя Payload 3.x в `peerDependencies` не поддерживает Next 16 — использовать Next.js 15.5.x и записать это в DECISIONS.md |
| CMS и админка | Payload CMS | 3.x (последняя стабильная) | Встраивается в то же Next.js-приложение, админка на `/admin` |
| БД | PostgreSQL | 16 | Адаптер `@payloadcms/db-postgres`, миграции Payload |
| Редактор текста | `@payloadcms/richtext-lexical` | в комплекте Payload | |
| Стили | Tailwind CSS | v4 | |
| UI-компоненты | shadcn/ui | актуальная | |
| Иконки | lucide-react | актуальная | |
| Валидация | Zod | 3.x | Все публичные эндпоинты |
| Изображения | sharp | в комплекте Payload | Ресайз, WebP, водяной знак |
| Email | `@payloadcms/email-nodemailer` + SMTP Яндекс 360 | | |
| Капча | Яндекс SmartCaptcha | | Не Google reCAPTCHA (152-ФЗ) |
| Аналитика | Яндекс Метрика | | Загружается только после согласия на cookie |
| Шрифты | `next/font/local` (self-hosted) | | Не загружать с fonts.googleapis.com |
| Среда выполнения | Node.js | 22 LTS | |
| Хостинг | Beget VPS, Ubuntu 24.04, 2 vCPU / 4 ГБ RAM / 40 ГБ NVMe | | Дата-центр в РФ |
| Оркестрация | Docker Compose | | Контейнеры: `app`, `db`, `caddy` |
| Веб-сервер и TLS | Caddy 2 | | Автоматический Let's Encrypt |
| Бэкапы | pg_dump + архив `media/` в S3-хранилище Beget | | Ежедневно, хранить 14 дней |

**Почему не Supabase + Vercel.** Форма собирает имя, телефон, email — это персональные данные. По 152-ФЗ первичный сбор и хранение должны идти в базах на территории РФ. Облачный Supabase и Vercel размещены за рубежом. Кроме того, клиенту нужна готовая админка на русском для каталога — Payload даёт её из коробки, на Supabase её пришлось бы писать с нуля.

**Запрещено использовать:** Supabase, Vercel, Supabase Edge Functions, Stripe, OpenAI, Google Fonts CDN, Google reCAPTCHA, Google Analytics, n8n, Lovable.

### 0.3 Роли

| Роль | Кто | Где работает | Доступ |
|---|---|---|---|
| guest | Любой посетитель (закупщик, снабженец, проектировщик) | Публичный сайт | Чтение опубликованного контента, отправка заявок |
| editor | Сотрудник клиента | `/admin` | Создание и редактирование товаров, категорий, объектов, документов, партнёров, медиа; просмотр и смена статуса заявок. Не может: удалять заявки, редактировать `site-settings`, управлять пользователями, удалять направления |
| admin | Исполнитель (разработчик) и владелец компании | `/admin` | Всё, включая пользователей, `site-settings`, направления, удаление заявок |

Публичной регистрации нет. Пользователей админки создаёт только admin.

### 0.4 Маршруты

| Путь | Экран | Доступ | Рендеринг |
|---|---|---|---|
| `/` | Главная | guest | ISR, revalidate 3600 + on-demand |
| `/produkciya` | Все направления | guest | ISR |
| `/produkciya/[direction]` | Направление: тип `catalog` — список категорий; тип `service` — страница услуги | guest | ISR |
| `/produkciya/[direction]/[category]` | Категория со списком товаров | guest | ISR, `?page=N` |
| `/produkciya/[direction]/[category]/[product]` | Карточка товара | guest | ISR |
| `/obekty` | Список объектов | guest | ISR, `?direction=slug&page=N` |
| `/obekty/[slug]` | Страница объекта | guest | ISR |
| `/dokumenty` | Документы и сертификаты | guest | ISR |
| `/o-kompanii` | О компании | guest | ISR |
| `/proizvodstvo` | Производство и оборудование | guest | ISR |
| `/goszakazchikam` | Для госзаказчиков | guest | ISR |
| `/dostavka-i-oplata` | Доставка и оплата | guest | ISR |
| `/garantiya` | Гарантия | guest | ISR |
| `/kontakty` | Контакты, реквизиты, карта, форма | guest | ISR |
| `/poisk` | Результаты поиска `?q=` | guest | Dynamic |
| `/politika-konfidencialnosti` | Политика обработки ПДн | guest | ISR |
| `/soglasie-na-obrabotku` | Согласие на обработку ПДн | guest | ISR |
| `/cookie` | Политика cookie | guest | ISR |
| `/admin` | Админка Payload | editor, admin | Payload |
| `/api/public/leads` | Приём заявок | guest | Route handler |
| `/api/public/search` | Живой поиск | guest | Route handler |
| `/api/public/health` | Проверка работоспособности | guest | Route handler |
| `/api/*` (прочее) | REST API Payload | editor, admin | Payload |
| `/sitemap.xml`, `/robots.txt` | SEO | guest | `app/sitemap.ts`, `app/robots.ts` |

Страницы `/o-kompanii`, `/proizvodstvo`, `/goszakazchikam`, `/dostavka-i-oplata`, `/garantiya` и три юридические страницы хранятся в коллекции `pages` и рендерятся одним шаблоном `app/(frontend)/[slug]/page.tsx`. Разрешённые slug этих страниц перечислены в `PAGE_SLUGS` (раздел 2.11); любой другой slug → 404.

### 0.5 Структура проекта

```
/
├── docker-compose.yml
├── Caddyfile
├── Dockerfile
├── .env.example
├── docs/
│   ├── SPEC.md
│   ├── PROJECT_IDEA.md
│   └── DECISIONS.md
├── scripts/
│   ├── backup.sh
│   └── seed.ts
├── public/
│   ├── fonts/            # self-hosted woff2
│   └── watermark.png     # водяной знак (генерируется из названия компании до появления логотипа)
└── src/
    ├── payload.config.ts
    ├── payload-types.ts   # генерируется: pnpm payload generate:types
    ├── collections/       # Users, Media, ProductImages, Files, Directions, Categories, Products, Projects, Documents, Partners, Pages, Leads
    ├── globals/           # SiteSettings, HomePage
    ├── hooks/             # slugify, revalidate, watermark, validateAttributes
    ├── access/            # isAdmin, isEditorOrAdmin, publishedOrLoggedIn
    ├── lib/
    │   ├── payload.ts     # getPayloadClient()
    │   ├── queries.ts     # все чтения данных для страниц
    │   ├── schemas.ts     # Zod-схемы
    │   ├── validators.ts  # ИНН, телефон, ОКПД2
    │   ├── rate-limit.ts
    │   ├── captcha.ts
    │   ├── notify/        # email.ts, telegram.ts, max.ts, index.ts
    │   ├── seo.ts         # generateMetadata-хелперы, JSON-LD
    │   └── format.ts      # размеры, сроки, телефоны
    ├── components/
    │   ├── ui/            # shadcn
    │   ├── layout/        # Header, Footer, MobileNav, Breadcrumbs, CookieBanner
    │   ├── catalog/       # DirectionCard, CategoryCard, ProductCard, ProductGallery, SpecTable, Pagination
    │   ├── projects/      # ProjectCard, ProjectGallery
    │   ├── forms/         # LeadForm, LeadDialog, SmartCaptcha
    │   └── blocks/        # Hero, Facts, Directions, Audiences, Production, Projects, Documents, Steps, Partners, CTA
    └── app/
        ├── (frontend)/    # публичный сайт
        └── (payload)/     # админка и REST Payload (генерируется шаблоном Payload)
```

---
## БЛОК 1: User Stories

### US-001: Закупщик проверяет поставщика
**Как** специалист по закупкам ГБУ «Жилищник», готовящий закупку скамеек по 44-ФЗ,
**я хочу** за 2–3 минуты найти реквизиты, документы и реализованные объекты компании,
**чтобы** включить её в список поставщиков для запроса цен.

**Сценарий:**
1. Закупщик находит сайт в Яндексе по запросу «производитель скамеек для благоустройства».
2. На главной видит блок «Цифры» и блок «Документы» с иконками сертификатов.
3. Прокручивает до подвала: там ИНН, ОГРН, юридическое наименование, адрес производства.
4. Открывает `/goszakazchikam`: видит ОКПД2 по группам продукции, отметку о реестре Минпромторга (если заполнено в `site-settings`), ссылки на документы, кнопку «Скачать карточку предприятия».
5. Открывает `/obekty`, фильтрует по направлению «Малые архитектурные формы», открывает 1–2 объекта.
6. Нажимает «Запросить КП» → открывается LeadDialog с типом `quote`.
7. Ошибка: если файл карточки предприятия не загружен в `site-settings.companyCardFile`, кнопка «Скачать карточку предприятия» не рендерится, вместо неё показывается таблица реквизитов из `site-settings`.

**Критерии приёмки:**
- [ ] ИНН, ОГРН, КПП, юридическое наименование и юридический адрес выводятся в подвале каждой страницы.
- [ ] Страница `/goszakazchikam` доступна из главного меню и из подвала.
- [ ] Реквизиты во всех местах сайта берутся из одного глобала `site-settings`.
- [ ] Путь «главная → документы → объект → форма» проходится не более чем за 5 кликов.

### US-002: Снабженец запрашивает КП по конкретному изделию
**Как** снабженец генподрядчика, которому нужно 40 скамеек для двора ЖК,
**я хочу** открыть карточку скамейки, увидеть габариты, материалы и срок изготовления и отправить запрос КП с количеством,
**чтобы** получить расчёт в тот же рабочий день.

**Сценарий:**
1. Переходит `/produkciya` → «Малые архитектурные формы» → «Скамейки».
2. В списке видит карточки с фото, названием, артикулом и габаритами.
3. Открывает карточку: галерея, таблица характеристик, срок изготовления, гарантия.
4. Нажимает «Запросить КП» → LeadDialog с типом `quote`, полем «Изделие» (предзаполнено, только чтение) и полем «Количество».
5. Заполняет имя, телефон, организацию, количество 40, отмечает согласие, проходит капчу, нажимает «Отправить».
6. Видит в диалоге экран успеха: «Заявка №1042 принята. Ответим в рабочее время в течение 1 часа». Текст обещания берётся из `site-settings.responseTimePromise`.
7. Ошибка сети: кнопка возвращается в активное состояние, под формой inline-сообщение «Не удалось отправить. Проверьте интернет и попробуйте ещё раз», введённые данные сохраняются в полях.
8. Ошибка валидации: под каждым неверным полем текст ошибки из раздела 5.1, фокус на первом неверном поле.

**Критерии приёмки:**
- [ ] Заявка сохраняется в `leads` с заполненными `product`, `quantity`, `sourceUrl`.
- [ ] Менеджер получает уведомление на email и в Telegram не позднее чем через 30 секунд.
- [ ] Номер заявки в ответе совпадает с `leads.number`.
- [ ] Повторная отправка той же формы в течение 60 секунд не создаёт дубль (раздел 5.2, правило R-04).

### US-003: Инженер запрашивает расчёт по направлению под заказ
**Как** главный инженер управляющей компании, которому нужны тепловые узлы для 3 зданий,
**я хочу** понять, что компания делает под ключ, и отправить описание задачи,
**чтобы** получить расчёт стоимости и сроков.

**Сценарий:**
1. Переходит `/produkciya/teplovye-uzly` (направление типа `service`).
2. Видит: первый экран с кнопкой «Запросить расчёт», состав работ, этапы, типы объектов, объекты с этим направлением, документы с этим направлением.
3. Нажимает «Запросить расчёт» → LeadDialog с типом `calculation`, поле «Направление» предзаполнено, поле «Описание задачи» обязательно.
4. Заполняет, отправляет, видит экран успеха.
5. Если у направления нет ни одного опубликованного объекта, блок «Объекты» не рендерится (а не пустой).

**Критерии приёмки:**
- [ ] Страница направления типа `service` не показывает список товаров.
- [ ] Поле `message` для типа `calculation` обязательно, минимум 20 символов.
- [ ] Заявка сохраняется с `direction`.

### US-004: Сотрудник клиента добавляет новый товар
**Как** сотрудник производства с ролью editor, у которого появилась новая урна,
**я хочу** добавить её в каталог за 15 минут без помощи разработчика,
**чтобы** она сразу появилась на сайте.

**Сценарий:**
1. Входит на `/admin` по email и паролю.
2. Открывает «Товары» → «Создать».
3. Заполняет название, выбирает направление и категорию, нажимает «Сохранить черновик». В блоке «Характеристики» появляются строки из набора атрибутов категории (например, «Объём, л», «Вкладыш») с пустыми значениями — их создаёт хук `prefillAttributes` (раздел 2.6).
4. Загружает 3 фото в поле «Галерея» (коллекция «Фото товаров»): водяной знак ставится автоматически.
5. Заполняет габариты, материалы, срок изготовления, гарантию, ОКПД2.
6. Нажимает «Опубликовать». Slug генерируется транслитерацией названия.
7. Через 5 секунд товар виден на сайте в своей категории.
8. Ошибка: если ОКПД2 не соответствует формату — сообщение под полем «Формат ОКПД2: 31.01.12.160», публикация блокируется. Если обязательный атрибут категории не заполнен — сообщение «Заполните характеристику „Объём, л“».

**Критерии приёмки:**
- [ ] Весь интерфейс админки на русском.
- [ ] Черновик не виден на сайте, опубликованный виден не позже чем через 10 секунд.
- [ ] Каждое загруженное фото товара на сайте отображается с водяным знаком.
- [ ] Товар можно создать без опциональных полей (ОКПД2, гарантия, сопутствующие товары).

### US-005: Менеджер получает и обрабатывает заявку
**Как** менеджер по продажам,
**я хочу** получать заявку в Telegram и на почту сразу после отправки и отмечать её статус в админке,
**чтобы** ответить в течение часа и не потерять ни одну заявку.

**Сценарий:**
1. Приходит сообщение в Telegram-чат менеджеров (формат в разделе 5.4) и письмо на адреса из `site-settings.notifyEmails`.
2. Сообщение содержит ссылку на заявку в админке `/admin/collections/leads/{id}`.
3. Менеджер открывает заявку, меняет статус `new` → `in_progress`, пишет комментарий.
4. После ответа клиенту ставит `done`.
5. Ошибка: если Telegram недоступен, заявка всё равно сохранена и письмо отправлено. В поле `notifications.telegram` записано `failed`, в списке заявок в админке такие заявки видны по фильтру.

**Критерии приёмки:**
- [ ] Заявка сохраняется в БД до отправки уведомлений; сбой уведомления не приводит к ошибке у посетителя.
- [ ] Список заявок в админке по умолчанию отсортирован по дате (новые сверху) и показывает колонки: номер, дата, тип, имя, организация, телефон, статус.
- [ ] editor не может удалить заявку.

### US-006: Администратор меняет контакты и цифры компании в одном месте
**Как** владелец компании с ролью admin,
**я хочу** поменять телефон, цифры «лет на рынке» или условия гарантии в одном месте,
**чтобы** они одинаково обновились на всех страницах.

**Сценарий:**
1. Открывает «Настройки сайта» в админке.
2. Меняет телефон или значение в «Цифры компании».
3. Сохраняет. Все страницы перевалидируются.
4. Проверяет главную, подвал, контакты — везде новое значение.

**Критерии приёмки:**
- [ ] Телефоны, email, мессенджеры, реквизиты, адрес производства, цифры компании, текст гарантии, обещание времени ответа существуют только в `site-settings` и нигде не продублированы в коде или в других коллекциях.
- [ ] После сохранения `site-settings` вызывается `revalidatePath('/', 'layout')`.

### US-007: Проектировщик находит характеристики изделия
**Как** ландшафтный архитектор, проектирующий сквер,
**я хочу** найти через поиск урну по артикулу и увидеть точные габариты и материалы,
**чтобы** заложить её в проект.

**Сценарий:**
1. Нажимает иконку поиска в шапке, вводит «УР-02».
2. Через 300 мс после окончания ввода появляется выпадающий список результатов (до 8), товар найден по артикулу.
3. Открывает карточку, видит таблицу характеристик в миллиметрах.
4. Если ничего не найдено — в выпадающем списке «Ничего не найдено. Напишите нам — подберём аналог» со ссылкой на `/kontakty`.

**Критерии приёмки:**
- [ ] Поиск ищет по названию и артикулу товаров, названиям категорий, направлений и объектов.
- [ ] Минимальная длина запроса — 2 символа; при меньшей длине запрос не отправляется.
- [ ] Enter в поле поиска ведёт на `/poisk?q=...`.

---
## БЛОК 2: Data Model

### 2.0 Принципы
- Схему PostgreSQL генерирует Payload из конфигураций коллекций ниже. Руками таблицы не создавать. Команды: `pnpm payload migrate:create <name>` после изменения коллекций, `pnpm payload migrate` при деплое.
- Все id — UUID: в `postgresAdapter` задано `idType: 'uuid'`.
- `createdAt` и `updatedAt` Payload добавляет в каждую коллекцию автоматически (эквивалент триггера moddatetime).
- **Эквивалент RLS.** PostgreSQL не открыт наружу (порт 5432 не публикуется в docker-compose), к нему подключается только контейнер `app`. Права на строки задаются в `access` каждой коллекции и `access` полей.
- **Важно про Local API.** `payload.find()` по умолчанию работает с `overrideAccess: true`, то есть игнорирует access-правила. Поэтому все чтения для публичного сайта идут только через `src/lib/queries.ts`, где для коллекций с черновиками всегда передаются `draft: false` и `where: { _status: { equals: 'published' } }`. Вызывать `payload.find` напрямую из страниц запрещено.
- Денежных полей в проекте нет (цены по запросу). Если появятся — `number` с `integer: true`, в копейках.
- Размеры изделий хранятся в миллиметрах (целое число), масса — в килограммах (число с одним знаком после запятой), сроки — в рабочих днях (целое число).

### 2.1 Диаграмма связей

```
users (auth)

directions 1──N categories          (categories.direction, ON DELETE: запрещено, см. хук)
directions 1──N products            (products.direction)
categories 1──N products            (products.category)
products   N──M products            (products.relatedProducts, до 4)
products   N──M product-images      (products.gallery, products.drawing)
projects   N──M directions          (projects.directions)
projects   N──M products            (projects.products)
projects   N──M media               (projects.cover, projects.gallery)
documents  N──1 files               (documents.file)
documents  N──M directions          (documents.directions)
partners   N──1 media               (partners.logo)
leads      N──1 products            (leads.product, SET NULL при удалении товара)
leads      N──1 directions          (leads.direction, SET NULL)
pages      (одиночные страницы по фиксированным slug)

globals: site-settings, home-page
```

Правило удаления: Payload хранит связи в таблицах `*_rels`, при удалении документа строки связей удаляются, в `leads` ссылка обнуляется. Удаление направления или категории, к которым привязаны товары, блокирует хук `preventDeleteIfUsed` (раздел 2.4): пользователь видит ошибку «Нельзя удалить: в категории 12 товаров. Сначала перенесите или удалите их».

### 2.2 Вспомогательный код

`src/access/index.ts`
```ts
import type { Access, FieldAccess } from 'payload'

type Role = 'admin' | 'editor'
const roleOf = (user: unknown): Role | undefined =>
  (user as { role?: Role } | null)?.role

export const anyone: Access = () => true
export const isAdmin: Access = ({ req: { user } }) => roleOf(user) === 'admin'
export const isEditorOrAdmin: Access = ({ req: { user } }) =>
  roleOf(user) === 'admin' || roleOf(user) === 'editor'
export const publishedOrLoggedIn: Access = ({ req: { user } }) =>
  user ? true : { _status: { equals: 'published' } }
export const nobody: Access = () => false

export const isAdminField: FieldAccess = ({ req: { user } }) => roleOf(user) === 'admin'
export const isLoggedInField: FieldAccess = ({ req: { user } }) => Boolean(user)
```

`src/hooks/slug.ts`
```ts
import type { Field, FieldHook } from 'payload'

const MAP: Record<string, string> = {
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'e', ж: 'zh', з: 'z', и: 'i',
  й: 'j', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't',
  у: 'u', ф: 'f', х: 'h', ц: 'c', ч: 'ch', ш: 'sh', щ: 'shch', ъ: '', ы: 'y', ь: '',
  э: 'e', ю: 'yu', я: 'ya',
}

// «Скамейка „Урсула“ 2.0» → "skamejka-ursula-2-0"
export const slugify = (input: string): string =>
  input
    .toLowerCase()
    .split('')
    .map((ch) => MAP[ch] ?? ch)
    .join('')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)

const formatSlug =
  (source: string): FieldHook =>
  ({ value, data }) => {
    if (typeof value === 'string' && value.trim() !== '') return slugify(value)
    const src = data?.[source]
    return typeof src === 'string' ? slugify(src) : value
  }

export const slugField = (source = 'title'): Field => ({
  name: 'slug',
  label: 'Адрес страницы (slug)',
  type: 'text',
  required: true,
  unique: true,
  index: true,
  admin: {
    position: 'sidebar',
    description: 'Заполняется автоматически из названия. Меняйте только при необходимости: старые ссылки перестанут работать.',
  },
  hooks: { beforeValidate: [formatSlug(source)] },
})
```

`src/hooks/revalidate.ts`
```ts
import { revalidatePath } from 'next/cache'
import type { CollectionAfterChangeHook, CollectionAfterDeleteHook, GlobalAfterChangeHook } from 'payload'

type Target = [path: string, type?: 'layout' | 'page']

const run = (targets: Target[], ctx: Record<string, unknown>) => {
  if (ctx.disableRevalidate) return // seed-скрипт передаёт context: { disableRevalidate: true }
  for (const [p, t] of targets) revalidatePath(p, t)
}

export const revalidateCollection =
  (targets: Target[]): CollectionAfterChangeHook =>
  ({ doc, context }) => {
    run(targets, context)
    return doc
  }

export const revalidateOnDelete =
  (targets: Target[]): CollectionAfterDeleteHook =>
  ({ doc, context }) => {
    run(targets, context)
    return doc
  }

export const revalidateGlobal =
  (targets: Target[]): GlobalAfterChangeHook =>
  ({ doc, context }) => {
    run(targets, context)
    return doc
  }

export const CATALOG_TARGETS: Target[] = [['/', 'page'], ['/produkciya', 'layout'], ['/sitemap.xml', 'page']]
export const PROJECTS_TARGETS: Target[] = [['/', 'page'], ['/obekty', 'layout'], ['/produkciya', 'layout'], ['/sitemap.xml', 'page']]
export const DOCUMENTS_TARGETS: Target[] = [['/', 'page'], ['/dokumenty', 'page'], ['/goszakazchikam', 'page'], ['/produkciya', 'layout']]
export const EVERYTHING: Target[] = [['/', 'layout']]
```

`src/hooks/watermark.ts`
```ts
import path from 'node:path'
import sharp from 'sharp'
import type { CollectionBeforeOperationHook } from 'payload'

const WATERMARK = path.join(process.cwd(), 'public', 'watermark.png')

export async function applyWatermark(input: Buffer): Promise<Buffer> {
  const base = sharp(input).rotate() // учитываем EXIF-ориентацию фото с телефона
  const { width = 1600 } = await base.metadata()
  const mark = await sharp(WATERMARK).resize({ width: Math.round(width * 0.35) }).toBuffer()
  return base.composite([{ input: mark, gravity: 'center' }]).toBuffer()
}

// Водяной знак вшивается до генерации imageSizes, поэтому он есть во всех размерах.
export const watermarkBeforeOperation: CollectionBeforeOperationHook = async ({ args, operation, req }) => {
  const file = req.file
  if ((operation === 'create' || operation === 'update') && file?.data && file.mimetype?.startsWith('image/')) {
    file.data = await applyWatermark(file.data)
    file.size = file.data.length
  }
  return args
}
```

`public/watermark.png` создаётся скриптом `scripts/make-watermark.ts`: PNG 1200×300, прозрачный фон, текст из `WATERMARK_TEXT` (название компании) белым с непрозрачностью 22% и тёмной обводкой с непрозрачностью 12%, шрифт — основной шрифт сайта. Когда клиент пришлёт логотип, PNG заменяется на монохромный логотип с той же прозрачностью. Код хука не меняется.

`src/lib/validators.ts`
```ts
// ИНН: 10 цифр (юрлицо) или 12 (ИП/физлицо), с проверкой контрольных сумм
export function isValidInn(inn: string): boolean {
  if (!/^\d{10}$|^\d{12}$/.test(inn)) return false
  const d = inn.split('').map(Number)
  const check = (weights: number[]) =>
    (weights.reduce((sum, w, i) => sum + w * d[i], 0) % 11) % 10
  if (d.length === 10) return check([2, 4, 10, 3, 5, 9, 4, 6, 8]) === d[9]
  return (
    check([7, 2, 4, 10, 3, 5, 9, 4, 6, 8]) === d[10] &&
    check([3, 7, 2, 4, 10, 3, 5, 9, 4, 6, 8]) === d[11]
  )
}

// Телефон РФ → +7XXXXXXXXXX или null
export function normalizeRuPhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, '')
  if (digits.length === 11 && (digits[0] === '7' || digits[0] === '8')) return `+7${digits.slice(1)}`
  if (digits.length === 10 && digits[0] === '9') return `+7${digits}`
  return null
}

// ОКПД2: 25.99, 31.01.12, 31.01.12.160
export const OKPD2_RE = /^\d{2}\.\d{1,2}(\.\d{1,2})?(\.\d{3})?$/
export const SKU_RE = /^[A-ZА-ЯЁ0-9][A-ZА-ЯЁ0-9.\-]{1,29}$/
export const ATTR_KEY_RE = /^[a-z][a-z0-9_]{1,39}$/

// валидатор для полей ОКПД2 в Payload
export const okpd2Validate = (v: unknown): true | string =>
  v == null || v === '' || (typeof v === 'string' && OKPD2_RE.test(v)) ? true : 'Формат ОКПД2: 31.01.12.160'
```

### 2.3 Коллекции: система и медиа

`src/collections/Users.ts`
```ts
import type { CollectionConfig } from 'payload'
import { isAdmin, isAdminField, isEditorOrAdmin } from '../access'

export const Users: CollectionConfig = {
  slug: 'users',
  labels: { singular: 'Пользователь', plural: 'Пользователи' },
  auth: {
    maxLoginAttempts: 5,
    lockTime: 15 * 60 * 1000,        // 15 минут блокировки после 5 неудачных попыток
    tokenExpiration: 8 * 60 * 60,     // 8 часов
    cookies: { secure: process.env.NODE_ENV === 'production', sameSite: 'Lax' },
  },
  admin: { useAsTitle: 'email', group: 'Система', defaultColumns: ['email', 'name', 'role'] },
  access: {
    admin: isEditorOrAdmin,
    read: isEditorOrAdmin,
    create: isAdmin,
    update: ({ req: { user }, id }) => (user as { role?: string } | null)?.role === 'admin' || user?.id === id,
    delete: isAdmin,
  },
  fields: [
    { name: 'name', label: 'Имя', type: 'text', required: true, maxLength: 80 },
    {
      name: 'role',
      label: 'Роль',
      type: 'select',
      required: true,
      defaultValue: 'editor',
      saveToJWT: true,
      options: [
        { label: 'Администратор', value: 'admin' },
        { label: 'Редактор', value: 'editor' },
      ],
      access: { create: isAdminField, update: isAdminField },
    },
  ],
}
```

`src/collections/Media.ts` (общие изображения: обложки, объекты, производство, логотипы партнёров)
```ts
import type { CollectionConfig } from 'payload'
import { anyone, isEditorOrAdmin } from '../access'

export const Media: CollectionConfig = {
  slug: 'media',
  labels: { singular: 'Изображение', plural: 'Изображения' },
  admin: { group: 'Медиа', useAsTitle: 'alt' },
  access: { read: anyone, create: isEditorOrAdmin, update: isEditorOrAdmin, delete: isEditorOrAdmin },
  upload: {
    staticDir: 'media/general',
    mimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
    resizeOptions: { width: 2560, withoutEnlargement: true },
    formatOptions: { format: 'webp', options: { quality: 82 } },
    imageSizes: [
      { name: 'thumb', width: 480, formatOptions: { format: 'webp', options: { quality: 78 } } },
      { name: 'card', width: 960, formatOptions: { format: 'webp', options: { quality: 80 } } },
      { name: 'hero', width: 1920, formatOptions: { format: 'webp', options: { quality: 82 } } },
    ],
    adminThumbnail: 'thumb',
  },
  fields: [
    { name: 'alt', label: 'Описание изображения (для незрячих и поисковиков)', type: 'text', required: true, maxLength: 200 },
  ],
}
```

`src/collections/ProductImages.ts` — как `Media`, со следующими отличиями:
```ts
export const ProductImages: CollectionConfig = {
  ...Media,
  slug: 'product-images',
  labels: { singular: 'Фото товара', plural: 'Фото товаров' },
  upload: { ...(Media.upload as object), staticDir: 'media/products' },
  hooks: { beforeOperation: [watermarkBeforeOperation] },
}
```

`src/collections/Files.ts` (PDF и сканы документов)
```ts
export const Files: CollectionConfig = {
  slug: 'files',
  labels: { singular: 'Файл', plural: 'Файлы' },
  admin: { group: 'Медиа', useAsTitle: 'filename' },
  access: { read: anyone, create: isEditorOrAdmin, update: isEditorOrAdmin, delete: isEditorOrAdmin },
  upload: { staticDir: 'media/files', mimeTypes: ['application/pdf', 'image/jpeg', 'image/png'] },
  fields: [{ name: 'title', label: 'Название для скачивания', type: 'text', required: true, maxLength: 150 }],
}
```

Лимит размера любого загружаемого файла — 20 МБ (`upload.limits.fileSize` в `payload.config.ts`).

### 2.4 Коллекции: направления и категории

`src/collections/Directions.ts`
```ts
import type { CollectionBeforeDeleteHook, CollectionConfig } from 'payload'
import { anyone, isAdmin, isEditorOrAdmin } from '../access'
import { slugField } from '../hooks/slug'
import { CATALOG_TARGETS, revalidateCollection, revalidateOnDelete } from '../hooks/revalidate'

export const preventDeleteIfUsed =
  (child: 'categories' | 'products', field: string, label: string): CollectionBeforeDeleteHook =>
  async ({ req, id }) => {
    const { totalDocs } = await req.payload.count({ collection: child, where: { [field]: { equals: id } }, req })
    if (totalDocs > 0) throw new Error(`Нельзя удалить: ${label} ${totalDocs}. Сначала перенесите или удалите их.`)
  }

export const Directions: CollectionConfig = {
  slug: 'directions',
  labels: { singular: 'Направление', plural: 'Направления' },
  admin: { group: 'Каталог', useAsTitle: 'title', defaultColumns: ['title', 'type', 'order'] },
  defaultSort: 'order',
  access: { read: anyone, create: isAdmin, update: isEditorOrAdmin, delete: isAdmin },
  hooks: {
    afterChange: [revalidateCollection(CATALOG_TARGETS)],
    afterDelete: [revalidateOnDelete(CATALOG_TARGETS)],
    beforeDelete: [preventDeleteIfUsed('categories', 'direction', 'категорий в направлении')],
  },
  fields: [
    { name: 'title', label: 'Название', type: 'text', required: true, maxLength: 80 },
    slugField(),
    {
      name: 'type', label: 'Тип страницы', type: 'select', required: true, defaultValue: 'catalog',
      options: [
        { label: 'Каталог (типовые изделия)', value: 'catalog' },
        { label: 'Услуга (работа под заказ)', value: 'service' },
      ],
    },
    { name: 'order', label: 'Порядок', type: 'number', defaultValue: 100, admin: { position: 'sidebar' } },
    { name: 'shortDescription', label: 'Кратко (для плиток)', type: 'textarea', required: true, maxLength: 200 },
    { name: 'cover', label: 'Обложка', type: 'upload', relationTo: 'media', required: true },
    { name: 'heroText', label: 'Подзаголовок первого экрана', type: 'textarea', maxLength: 300 },
    { name: 'description', label: 'Описание', type: 'richText' },
    { name: 'okpd2', label: 'ОКПД2 группы продукции', type: 'text', admin: { description: 'Для страницы «Госзаказчикам». Пример: 31.01.12' } },
    {
      name: 'service', label: 'Содержимое страницы услуги', type: 'group',
      admin: { condition: (data) => data?.type === 'service' },
      fields: [
        { name: 'workScope', label: 'Состав работ', type: 'array', maxRows: 12, fields: [{ name: 'item', type: 'text', required: true, maxLength: 150 }] },
        { name: 'stages', label: 'Этапы', type: 'array', maxRows: 8, fields: [
          { name: 'title', type: 'text', required: true, maxLength: 60 },
          { name: 'text', type: 'textarea', maxLength: 300 },
        ] },
        { name: 'objectTypes', label: 'Для каких объектов', type: 'array', maxRows: 10, fields: [{ name: 'item', type: 'text', required: true, maxLength: 80 }] },
        { name: 'formHint', label: 'Подсказка в форме расчёта', type: 'text', maxLength: 200,
          defaultValue: 'Опишите объект, объём и сроки — подготовим расчёт за 1–2 рабочих дня' },
      ],
    },
  ],
}
```

`src/collections/Categories.ts`
```ts
export const Categories: CollectionConfig = {
  slug: 'categories',
  labels: { singular: 'Категория', plural: 'Категории' },
  admin: { group: 'Каталог', useAsTitle: 'title', defaultColumns: ['title', 'direction', 'order'] },
  defaultSort: 'order',
  access: { read: anyone, create: isEditorOrAdmin, update: isEditorOrAdmin, delete: isEditorOrAdmin },
  hooks: {
    afterChange: [revalidateCollection(CATALOG_TARGETS)],
    afterDelete: [revalidateOnDelete(CATALOG_TARGETS)],
    beforeDelete: [preventDeleteIfUsed('products', 'category', 'товаров в категории')],
  },
  fields: [
    { name: 'title', label: 'Название', type: 'text', required: true, maxLength: 80 },
    slugField(),
    {
      name: 'direction', label: 'Направление', type: 'relationship', relationTo: 'directions', required: true, index: true,
      filterOptions: { type: { equals: 'catalog' } }, // категории только у направлений-каталогов
    },
    { name: 'order', label: 'Порядок', type: 'number', defaultValue: 100, admin: { position: 'sidebar' } },
    { name: 'shortDescription', label: 'Кратко', type: 'textarea', maxLength: 200 },
    { name: 'cover', label: 'Обложка', type: 'upload', relationTo: 'media' },
    { name: 'description', label: 'Текст категории (SEO)', type: 'richText' },
    { name: 'okpd2', label: 'ОКПД2 по умолчанию для товаров', type: 'text', validate: okpd2Validate },
    {
      name: 'attributeSet', label: 'Набор характеристик товаров категории', type: 'array', maxRows: 15,
      admin: { description: 'Эти строки появятся в каждом товаре категории после сохранения черновика' },
      fields: [
        { name: 'key', label: 'Ключ (латиница)', type: 'text', required: true, validate: (v: unknown) =>
            typeof v === 'string' && ATTR_KEY_RE.test(v) ? true : 'Только латиница, цифры и _, например seats_count' },
        { name: 'label', label: 'Название', type: 'text', required: true, maxLength: 60 },
        { name: 'unit', label: 'Единица', type: 'text', maxLength: 10 },
        { name: 'required', label: 'Обязательно', type: 'checkbox', defaultValue: false },
      ],
    },
  ],
}

// Импорты в начале файла:
// import { ATTR_KEY_RE, okpd2Validate } from '../lib/validators'
```

**Начальные наборы характеристик** (создаются `scripts/seed.ts`, дальше редактирует клиент):

| Категория | key | label | unit | required |
|---|---|---|---|---|
| Скамейки | seats_count | Посадочных мест | шт | да |
| Скамейки | has_backrest | Спинка | — | да |
| Скамейки | wood_species | Порода дерева | — | нет |
| Скамейки | mounting | Способ установки | — | да |
| Урны | volume | Объём | л | да |
| Урны | has_liner | Вкладыш | — | нет |
| Навесы и перголы | area | Площадь | м² | да |
| Навесы и перголы | roof_material | Материал кровли | — | нет |
| Противопожарные двери | fire_rating | Предел огнестойкости | — | да |
| Противопожарные двери | leaves | Количество створок | шт | да |
| Противопожарные двери | certificate | Сертификат ТР ЕАЭС 043/2017 | — | нет |
| Противопожарные двери | hardware | Комплектация | — | нет |

### 2.5 Начальные данные направлений (seed)

| order | title | slug | type |
|---|---|---|---|
| 10 | Малые архитектурные формы | maf | catalog |
| 20 | Уличная мебель | ulichnaya-mebel | catalog |
| 30 | Противопожарные двери | protivopozharnye-dveri | catalog |
| 40 | Фасадные системы | fasadnye-sistemy | service |
| 50 | Тепловые узлы | teplovye-uzly | service |
| 60 | Шумозащитные кожухи | shumozashchitnye-kozhuhi | service |
| 70 | Проектирование котельных | proektirovanie-kotelnyh | service |

Seed создаёт направления, 2 категории МАФ (Скамейки, Урны), 1 категорию мебели (Столы), 1 категорию дверей (Двери EI 60), наборы характеристик из таблицы 2.4, страницы из `PAGE_SLUGS` с заголовками и пустым текстом, глобалы с данными из раздела 5.8, пользователя admin из `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD`. Seed идемпотентен: если документ с таким slug существует, он пропускается.

### 2.6 Коллекция: товары

`src/hooks/attributes.ts`
```ts
import { APIError, type CollectionBeforeChangeHook } from 'payload'

const idOf = (v: unknown): string | undefined =>
  typeof v === 'object' && v !== null ? (v as { id: string }).id : (v as string | undefined)

// 1) проверяет, что категория принадлежит направлению
// 2) приводит строки characteristics к набору категории (добавляет недостающие, удаляет лишние, сохраняет введённые значения)
// 3) при публикации требует заполнить обязательные характеристики
// 4) подставляет ОКПД2 категории, если у товара он пустой
export const syncAttributes: CollectionBeforeChangeHook = async ({ data, req }) => {
  const categoryId = idOf(data.category)
  if (!categoryId) return data

  const category = await req.payload.findByID({ collection: 'categories', id: categoryId, depth: 0, req })
  if (idOf(category.direction) !== idOf(data.direction)) {
    throw new APIError('Категория не относится к выбранному направлению', 400)
  }

  const current: Array<{ key: string; value?: string }> = data.attributes ?? []
  const set = category.attributeSet ?? []
  data.attributes = set.map((a) => ({
    key: a.key,
    label: a.label,
    unit: a.unit ?? '',
    value: current.find((c) => c.key === a.key)?.value ?? '',
  }))

  if (data._status === 'published') {
    const missing = set.find((a) => a.required && !data.attributes.find((x: { key: string; value: string }) => x.key === a.key)?.value?.trim())
    if (missing) throw new APIError(`Заполните характеристику «${missing.label}»`, 400)
  }

  if (!data.okpd2 && category.okpd2) data.okpd2 = category.okpd2
  return data
}
```

`src/collections/Products.ts`
```ts
import type { CollectionConfig } from 'payload'
import { isEditorOrAdmin, publishedOrLoggedIn } from '../access'
import { slugField } from '../hooks/slug'
import { syncAttributes } from '../hooks/attributes'
import { CATALOG_TARGETS, revalidateCollection, revalidateOnDelete } from '../hooks/revalidate'
import { SKU_RE, okpd2Validate } from '../lib/validators'

export const Products: CollectionConfig = {
  slug: 'products',
  labels: { singular: 'Товар', plural: 'Товары' },
  versions: { drafts: true, maxPerDoc: 20 },
  defaultSort: 'order',
  admin: {
    group: 'Каталог',
    useAsTitle: 'title',
    defaultColumns: ['title', 'sku', 'category', '_status', 'updatedAt'],
    listSearchableFields: ['title', 'sku'],
  },
  access: { read: publishedOrLoggedIn, create: isEditorOrAdmin, update: isEditorOrAdmin, delete: isEditorOrAdmin },
  hooks: {
    beforeChange: [syncAttributes],
    afterChange: [revalidateCollection(CATALOG_TARGETS)],
    afterDelete: [revalidateOnDelete(CATALOG_TARGETS)],
  },
  fields: [
    { name: 'title', label: 'Название', type: 'text', required: true, maxLength: 120 },
    slugField(),
    { name: 'sku', label: 'Артикул', type: 'text', required: true, unique: true, index: true,
      validate: (v: unknown) => (typeof v === 'string' && SKU_RE.test(v) ? true : 'Заглавные буквы, цифры, точка и дефис, 2–30 символов. Пример: СК-014') },
    { name: 'direction', label: 'Направление', type: 'relationship', relationTo: 'directions', required: true, index: true,
      filterOptions: { type: { equals: 'catalog' } } },
    { name: 'category', label: 'Категория', type: 'relationship', relationTo: 'categories', required: true, index: true,
      filterOptions: ({ data }) => (data?.direction ? { direction: { equals: data.direction } } : true) },
    { name: 'shortDescription', label: 'Кратко (под названием)', type: 'textarea', maxLength: 300 },
    { name: 'gallery', label: 'Фото (первое — главное)', type: 'upload', relationTo: 'product-images', hasMany: true, minRows: 1, maxRows: 12, required: true },
    { name: 'drawing', label: 'Чертёж (изображение для вкладки «Чертёж»)', type: 'upload', relationTo: 'product-images' },
    { name: 'description', label: 'Описание', type: 'richText' },
    {
      type: 'row',
      fields: [
        { name: 'lengthMm', label: 'Длина, мм', type: 'number', min: 1, max: 20000, admin: { step: 1 } },
        { name: 'widthMm', label: 'Ширина, мм', type: 'number', min: 1, max: 20000, admin: { step: 1 } },
        { name: 'heightMm', label: 'Высота, мм', type: 'number', min: 1, max: 20000, admin: { step: 1 } },
        { name: 'weightKg', label: 'Масса, кг', type: 'number', min: 0, max: 10000 },
      ],
    },
    { name: 'materials', label: 'Материалы', type: 'array', maxRows: 8, fields: [{ name: 'material', type: 'text', required: true, maxLength: 80 }] },
    { name: 'coating', label: 'Покрытие', type: 'text', maxLength: 150, admin: { description: 'Пример: порошковая окраска по RAL, цвет по выбору' } },
    {
      type: 'row',
      fields: [
        { name: 'productionDaysMin', label: 'Срок изготовления от, раб. дн.', type: 'number', min: 1, max: 365 },
        { name: 'productionDaysMax', label: 'до, раб. дн.', type: 'number', min: 1, max: 365,
          validate: (v: unknown, { siblingData }: { siblingData: { productionDaysMin?: number } }) =>
            v == null || siblingData.productionDaysMin == null || (v as number) >= siblingData.productionDaysMin ? true : '«До» должно быть не меньше «от»' },
        { name: 'warrantyMonths', label: 'Гарантия, мес.', type: 'number', min: 1, max: 360 },
      ],
    },
    { name: 'okpd2', label: 'ОКПД2', type: 'text', validate: okpd2Validate },
    { name: 'inGispRegistry', label: 'В реестре российской промышленной продукции (ГИСП)', type: 'checkbox', defaultValue: false },
    { name: 'gispRegistryNumber', label: 'Номер реестровой записи', type: 'text', maxLength: 50,
      admin: { condition: (d) => Boolean(d?.inGispRegistry) } },
    {
      name: 'attributes', label: 'Характеристики категории', type: 'array',
      admin: { description: 'Строки создаются из набора характеристик категории при сохранении. Заполните только «Значение».' },
      fields: [
        { name: 'key', type: 'text', admin: { hidden: true } },
        { type: 'row', fields: [
          { name: 'label', label: 'Характеристика', type: 'text', admin: { readOnly: true } },
          { name: 'value', label: 'Значение', type: 'text', maxLength: 120 },
          { name: 'unit', label: 'Ед.', type: 'text', admin: { readOnly: true, width: '80px' } },
        ] },
      ],
    },
    { name: 'relatedProducts', label: 'Похожие товары', type: 'relationship', relationTo: 'products', hasMany: true, maxRows: 4 },
    { name: 'featured', label: 'Показывать на главной', type: 'checkbox', defaultValue: false, admin: { position: 'sidebar' } },
    { name: 'order', label: 'Порядок', type: 'number', defaultValue: 100, admin: { position: 'sidebar' } },
  ],
}
```

### 2.7 Коллекция: объекты

`src/collections/Projects.ts`
```ts
export const Projects: CollectionConfig = {
  slug: 'projects',
  labels: { singular: 'Объект', plural: 'Объекты' },
  versions: { drafts: true, maxPerDoc: 20 },
  defaultSort: '-year',
  admin: { group: 'Контент', useAsTitle: 'title', defaultColumns: ['title', 'year', 'city', '_status'] },
  access: { read: publishedOrLoggedIn, create: isEditorOrAdmin, update: isEditorOrAdmin, delete: isEditorOrAdmin },
  hooks: { afterChange: [revalidateCollection(PROJECTS_TARGETS)], afterDelete: [revalidateOnDelete(PROJECTS_TARGETS)] },
  fields: [
    { name: 'title', label: 'Название объекта', type: 'text', required: true, maxLength: 120 },
    slugField(),
    { type: 'row', fields: [
      { name: 'year', label: 'Год', type: 'number', required: true, index: true,
        validate: (v: unknown) => typeof v === 'number' && v >= 2000 && v <= new Date().getFullYear() + 1 ? true : 'Год от 2000 до следующего года' },
      { name: 'city', label: 'Город', type: 'text', required: true, maxLength: 60 },
    ] },
    { name: 'customerName', label: 'Заказчик', type: 'text', maxLength: 150 },
    { name: 'showCustomer', label: 'Показывать заказчика на сайте', type: 'checkbox', defaultValue: false,
      admin: { description: 'Включайте, только если в договоре нет запрета на публикацию' } },
    { name: 'directions', label: 'Направления', type: 'relationship', relationTo: 'directions', hasMany: true, required: true, minRows: 1, index: true },
    { name: 'products', label: 'Использованные изделия', type: 'relationship', relationTo: 'products', hasMany: true, maxRows: 20 },
    { name: 'summary', label: 'Кратко (что сделали, объём)', type: 'textarea', required: true, maxLength: 300 },
    { name: 'description', label: 'Подробно', type: 'richText' },
    { name: 'cover', label: 'Обложка', type: 'upload', relationTo: 'media', required: true },
    { name: 'gallery', label: 'Галерея', type: 'upload', relationTo: 'media', hasMany: true, maxRows: 30 },
    { name: 'featured', label: 'Показывать на главной', type: 'checkbox', defaultValue: false, admin: { position: 'sidebar' } },
  ],
}
```

### 2.8 Коллекции: документы и партнёры

`src/collections/Documents.ts`
```ts
export const DOC_TYPES = [
  { label: 'Сертификат', value: 'certificate' },
  { label: 'Декларация соответствия', value: 'declaration' },
  { label: 'Свидетельство СРО', value: 'sro' },
  { label: 'Лицензия', value: 'license' },
  { label: 'Реестр Минпромторга', value: 'registry' },
  { label: 'Благодарственное письмо', value: 'letter' },
  { label: 'Каталог (PDF)', value: 'catalog' },
  { label: 'Другое', value: 'other' },
] as const

export const Documents: CollectionConfig = {
  slug: 'documents',
  labels: { singular: 'Документ', plural: 'Документы' },
  defaultSort: 'order',
  admin: { group: 'Контент', useAsTitle: 'title', defaultColumns: ['title', 'docType', 'validUntil', 'showOnHome'] },
  access: { read: anyone, create: isEditorOrAdmin, update: isEditorOrAdmin, delete: isEditorOrAdmin },
  hooks: { afterChange: [revalidateCollection(DOCUMENTS_TARGETS)], afterDelete: [revalidateOnDelete(DOCUMENTS_TARGETS)] },
  fields: [
    { name: 'title', label: 'Название', type: 'text', required: true, maxLength: 150 },
    { name: 'docType', label: 'Тип', type: 'select', required: true, options: [...DOC_TYPES], index: true },
    { name: 'file', label: 'Файл', type: 'upload', relationTo: 'files', required: true },
    { name: 'preview', label: 'Превью (скан первой страницы)', type: 'upload', relationTo: 'media' },
    { type: 'row', fields: [
      { name: 'number', label: 'Номер', type: 'text', maxLength: 60 },
      { name: 'issuedAt', label: 'Дата выдачи', type: 'date', admin: { date: { pickerAppearance: 'dayOnly', displayFormat: 'dd.MM.yyyy' } } },
      { name: 'validUntil', label: 'Действует до', type: 'date', index: true, admin: { date: { pickerAppearance: 'dayOnly', displayFormat: 'dd.MM.yyyy' } } },
    ] },
    { name: 'directions', label: 'Относится к направлениям', type: 'relationship', relationTo: 'directions', hasMany: true },
    { name: 'showOnHome', label: 'Показывать на главной', type: 'checkbox', defaultValue: false },
    { name: 'order', label: 'Порядок', type: 'number', defaultValue: 100 },
  ],
}
```

`src/collections/Partners.ts`
```ts
export const Partners: CollectionConfig = {
  slug: 'partners',
  labels: { singular: 'Партнёр', plural: 'Партнёры' },
  defaultSort: 'order',
  admin: { group: 'Контент', useAsTitle: 'name' },
  access: { read: anyone, create: isEditorOrAdmin, update: isEditorOrAdmin, delete: isEditorOrAdmin },
  hooks: { afterChange: [revalidateCollection([['/', 'page']])] },
  fields: [
    { name: 'name', label: 'Название', type: 'text', required: true, maxLength: 100 },
    { name: 'logo', label: 'Логотип', type: 'upload', relationTo: 'media', required: true },
    { name: 'url', label: 'Сайт', type: 'text', validate: (v: unknown) => !v || /^https:\/\/\S+$/.test(String(v)) ? true : 'Ссылка должна начинаться с https://' },
    { name: 'active', label: 'Показывать', type: 'checkbox', defaultValue: false },
    { name: 'order', label: 'Порядок', type: 'number', defaultValue: 100 },
  ],
}
```
Блок «Партнёры» на главной выводится, только если `home-page.showPartners = true` и есть хотя бы один партнёр с `active = true`.

### 2.9 Коллекция: заявки

`src/collections/Leads.ts`
```ts
import type { CollectionConfig, Field } from 'payload'
import { isAdmin, isEditorOrAdmin, nobody } from '../access'

const ro = (f: Field): Field => ({ ...f, admin: { ...(f as { admin?: object }).admin, readOnly: true } } as Field)
const NOTIFY_OPTIONS = [
  { label: 'Ожидает', value: 'pending' },
  { label: 'Отправлено', value: 'sent' },
  { label: 'Ошибка', value: 'failed' },
  { label: 'Канал выключен', value: 'skipped' },
]

export const Leads: CollectionConfig = {
  slug: 'leads',
  labels: { singular: 'Заявка', plural: 'Заявки' },
  defaultSort: '-createdAt',
  admin: {
    group: 'Заявки',
    useAsTitle: 'name',
    defaultColumns: ['number', 'createdAt', 'type', 'name', 'organization', 'phone', 'status'],
    listSearchableFields: ['name', 'phone', 'email', 'organization'],
  },
  access: {
    create: nobody,           // создаются только в /api/public/leads через Local API с overrideAccess: true
    read: isEditorOrAdmin,
    update: isEditorOrAdmin,  // фактически меняются только status и managerComment (остальные поля readOnly)
    delete: isAdmin,
  },
  fields: [
    ro({ name: 'number', label: '№', type: 'number', required: true, unique: true, index: true }),
    ro({ name: 'type', label: 'Тип', type: 'select', required: true, options: [
      { label: 'Обратный звонок', value: 'callback' },
      { label: 'Запрос КП', value: 'quote' },
      { label: 'Запрос расчёта', value: 'calculation' },
    ] }),
    {
      name: 'status', label: 'Статус', type: 'select', required: true, defaultValue: 'new', index: true,
      admin: { position: 'sidebar' },
      options: [
        { label: 'Новая', value: 'new' },
        { label: 'В работе', value: 'in_progress' },
        { label: 'Обработана', value: 'done' },
        { label: 'Спам', value: 'spam' },
      ],
    },
    { name: 'managerComment', label: 'Комментарий менеджера', type: 'textarea', maxLength: 2000, admin: { position: 'sidebar' } },
    ro({ name: 'name', label: 'Имя', type: 'text', required: true }),
    ro({ name: 'phone', label: 'Телефон', type: 'text', required: true, index: true }),
    ro({ name: 'email', label: 'Email', type: 'email' }),
    ro({ name: 'organization', label: 'Организация', type: 'text' }),
    ro({ name: 'inn', label: 'ИНН', type: 'text' }),
    ro({ name: 'region', label: 'Регион поставки', type: 'text' }),
    ro({ name: 'product', label: 'Изделие', type: 'relationship', relationTo: 'products' }),
    ro({ name: 'direction', label: 'Направление', type: 'relationship', relationTo: 'directions' }),
    ro({ name: 'quantity', label: 'Количество', type: 'number' }),
    ro({ name: 'message', label: 'Сообщение', type: 'textarea' }),
    ro({ name: 'sourceUrl', label: 'Страница отправки', type: 'text' }),
    ro({ name: 'utm', label: 'UTM-метки', type: 'json' }),
    ro({ name: 'consentAt', label: 'Согласие на обработку ПДн получено', type: 'date', required: true }),
    ro({ name: 'consentVersion', label: 'Версия текста согласия', type: 'text', required: true }),
    ro({ name: 'ip', label: 'IP', type: 'text' }),
    ro({ name: 'userAgent', label: 'Браузер', type: 'text' }),
    ro({ name: 'dedupeKey', label: 'Ключ дедупликации', type: 'text', index: true, admin: { hidden: true } }),
    {
      name: 'notifications', label: 'Доставка уведомлений', type: 'group', admin: { readOnly: true },
      fields: [
        { name: 'email', type: 'select', defaultValue: 'pending', options: NOTIFY_OPTIONS, index: true },
        { name: 'telegram', type: 'select', defaultValue: 'pending', options: NOTIFY_OPTIONS, index: true },
        { name: 'max', type: 'select', defaultValue: 'pending', options: NOTIFY_OPTIONS },
        { name: 'attempts', type: 'number', defaultValue: 0 },
        { name: 'lastError', type: 'text' },
      ],
    },
  ],
}
```

Номер заявки берётся из последовательности PostgreSQL (без гонок при одновременных заявках):
```ts
// src/lib/lead-number.ts
import { sql } from '@payloadcms/db-postgres'
import type { Payload } from 'payload'

export async function nextLeadNumber(payload: Payload): Promise<number> {
  const db = payload.db as unknown as { drizzle: { execute: (q: unknown) => Promise<{ rows: Array<{ n: string }> }> } }
  const res = await db.drizzle.execute(sql`SELECT nextval('lead_number_seq') AS n`)
  return Number(res.rows[0].n)
}
```

### 2.10 Коллекция: страницы

`src/collections/Pages.ts`
```ts
export const PAGE_SLUGS = [
  { label: 'О компании', value: 'o-kompanii' },
  { label: 'Производство', value: 'proizvodstvo' },
  { label: 'Госзаказчикам', value: 'goszakazchikam' },
  { label: 'Доставка и оплата', value: 'dostavka-i-oplata' },
  { label: 'Гарантия', value: 'garantiya' },
  { label: 'Политика обработки ПДн', value: 'politika-konfidencialnosti' },
  { label: 'Согласие на обработку ПДн', value: 'soglasie-na-obrabotku' },
  { label: 'Политика cookie', value: 'cookie' },
] as const

export const Pages: CollectionConfig = {
  slug: 'pages',
  labels: { singular: 'Страница', plural: 'Страницы' },
  admin: { group: 'Контент', useAsTitle: 'title' },
  access: { read: anyone, create: isAdmin, update: isEditorOrAdmin, delete: isAdmin },
  hooks: { afterChange: [revalidateCollection([['/', 'layout']])] },
  fields: [
    { name: 'title', label: 'Заголовок', type: 'text', required: true, maxLength: 100 },
    { name: 'slug', label: 'Страница', type: 'select', required: true, unique: true, options: [...PAGE_SLUGS] },
    { name: 'lead', label: 'Вводный абзац', type: 'textarea', maxLength: 400 },
    { name: 'cover', label: 'Обложка', type: 'upload', relationTo: 'media' },
    { name: 'content', label: 'Текст', type: 'richText', required: true },
    { name: 'gallery', label: 'Галерея (для «Производства»)', type: 'upload', relationTo: 'media', hasMany: true, maxRows: 30 },
    { name: 'version', label: 'Версия документа (для юридических страниц)', type: 'text', maxLength: 20,
      admin: { description: 'Пример: 2026-10-01. Меняйте при каждой правке текста согласия' } },
  ],
}
```

Страницы `goszakazchikam`, `garantiya`, `kontakty` дополняются данными из `site-settings` и коллекций (ОКПД2 направлений, документы, реквизиты) в шаблоне страницы — редактор правит только текст.

### 2.11 Глобалы

`src/globals/SiteSettings.ts` — единственный источник контактов, реквизитов и цифр компании.
```ts
import type { GlobalConfig } from 'payload'
import { anyone, isAdmin, isLoggedInField } from '../access'
import { revalidateGlobal, EVERYTHING } from '../hooks/revalidate'

export const SiteSettings: GlobalConfig = {
  slug: 'site-settings',
  label: 'Настройки сайта',
  admin: { group: 'Система' },
  access: { read: anyone, update: isAdmin },
  hooks: { afterChange: [revalidateGlobal(EVERYTHING)] },
  fields: [
    { type: 'tabs', tabs: [
      { label: 'Компания', fields: [
        { name: 'companyName', label: 'Название (как на сайте)', type: 'text', required: true, maxLength: 60 },
        { name: 'tagline', label: 'Подпись к логотипу', type: 'text', maxLength: 80 },
        { name: 'logo', label: 'Логотип (SVG/PNG)', type: 'upload', relationTo: 'media' },
        { name: 'facts', label: 'Цифры компании', type: 'array', maxRows: 4, fields: [
          { name: 'value', label: 'Значение', type: 'text', required: true, maxLength: 12 },
          { name: 'label', label: 'Подпись', type: 'text', required: true, maxLength: 50 },
        ] },
        { name: 'warrantyShort', label: 'Гарантия одной строкой', type: 'text', maxLength: 120,
          admin: { description: 'Показывается на главной, в карточках и на странице «Гарантия». Писать только здесь.' } },
        { name: 'responseTimePromise', label: 'Обещание времени ответа', type: 'text', maxLength: 100,
          defaultValue: 'Ответим в рабочее время в течение 1 часа' },
        { name: 'catalogPdf', label: 'PDF-каталог', type: 'upload', relationTo: 'files' },
        { name: 'companyCardFile', label: 'Карточка предприятия (PDF)', type: 'upload', relationTo: 'files' },
        { name: 'gispNote', label: 'Текст о реестре Минпромторга', type: 'textarea', maxLength: 300,
          admin: { description: 'Оставьте пустым, если продукции нет в реестре — блок не будет показан' } },
      ] },
      { label: 'Контакты', fields: [
        { name: 'phones', label: 'Телефоны', type: 'array', minRows: 1, maxRows: 4, fields: [
          { name: 'number', label: 'Номер', type: 'text', required: true, validate: (v: unknown) =>
              normalizeRuPhone(String(v ?? '')) ? true : 'Формат: +7 985 975-03-50' },
          { name: 'label', label: 'Подпись', type: 'text', maxLength: 40 },
          { name: 'primary', label: 'Основной (в шапке)', type: 'checkbox', defaultValue: false },
        ] },
        { name: 'emails', label: 'Email', type: 'array', minRows: 1, maxRows: 3, fields: [
          { name: 'email', type: 'email', required: true },
          { name: 'label', type: 'text', maxLength: 40 },
        ] },
        { name: 'telegramUrl', label: 'Telegram (https://t.me/...)', type: 'text' },
        { name: 'maxUrl', label: 'MAX (https://max.ru/...)', type: 'text' },
        { name: 'whatsappUrl', label: 'WhatsApp (https://wa.me/...)', type: 'text',
          admin: { description: 'Не рекомендуется: сервис ограничен в РФ. Если пусто — кнопка не показывается.' } },
        { name: 'workingHours', label: 'Режим работы', type: 'text', defaultValue: 'пн–пт 9:00–18:00', maxLength: 60 },
        { name: 'productionAddress', label: 'Фактический адрес производства', type: 'text', maxLength: 200 },
        { type: 'row', fields: [
          { name: 'lat', label: 'Широта', type: 'number', min: 41, max: 82 },
          { name: 'lng', label: 'Долгота', type: 'number', min: 19, max: 180 },
        ] },
      ] },
      { label: 'Реквизиты', fields: [
        { name: 'legalName', label: 'Полное наименование', type: 'text', maxLength: 200 },
        { type: 'row', fields: [
          { name: 'inn', label: 'ИНН', type: 'text', validate: (v: unknown) => !v || isValidInn(String(v)) ? true : 'Неверный ИНН' },
          { name: 'kpp', label: 'КПП', type: 'text', validate: (v: unknown) => !v || /^\d{9}$/.test(String(v)) ? true : '9 цифр' },
          { name: 'ogrn', label: 'ОГРН / ОГРНИП', type: 'text', validate: (v: unknown) => !v || /^\d{13}$|^\d{15}$/.test(String(v)) ? true : '13 или 15 цифр' },
        ] },
        { name: 'legalAddress', label: 'Юридический адрес', type: 'text', maxLength: 250 },
        { name: 'bankDetails', label: 'Банковские реквизиты', type: 'textarea', maxLength: 600 },
      ] },
      { label: 'Уведомления', fields: [
        { name: 'notifyEmails', label: 'Email для заявок', type: 'array', minRows: 1, maxRows: 5,
          access: { read: isLoggedInField }, fields: [{ name: 'email', type: 'email', required: true }] },
        { name: 'telegramChatIds', label: 'Telegram chat_id', type: 'array', maxRows: 5,
          access: { read: isLoggedInField }, fields: [{ name: 'chatId', type: 'text', required: true }] },
        { name: 'maxChatIds', label: 'MAX chat_id', type: 'array', maxRows: 5,
          access: { read: isLoggedInField }, fields: [{ name: 'chatId', type: 'text', required: true }] },
      ] },
      { label: 'Аналитика', fields: [
        { name: 'metrikaId', label: 'ID счётчика Яндекс Метрики', type: 'text', validate: (v: unknown) => !v || /^\d{6,10}$/.test(String(v)) ? true : 'Только цифры' },
        { name: 'yandexVerification', label: 'Код подтверждения Яндекс Вебмастера', type: 'text' },
      ] },
    ] },
  ],
}
```
Импорты вверху файла: `import { isValidInn, normalizeRuPhone } from '../lib/validators'`. Реквизиты и адрес не обязательны для сохранения, потому что клиент пришлёт карточку предприятия позже; компоненты выводят только заполненные строки, а блок «Реквизиты» целиком скрывается, если пусты `legalName` и `inn`. Заполненность реквизитов — пункт предзапускного чек-листа (5.10). Если в `phones` нет строки с `primary = true`, основным считается первый номер. Токены ботов в админке не хранятся — только в переменных окружения.

`src/globals/HomePage.ts`
```ts
export const HomePage: GlobalConfig = {
  slug: 'home-page',
  label: 'Главная страница',
  admin: { group: 'Контент' },
  access: { read: anyone, update: isEditorOrAdmin },
  hooks: { afterChange: [revalidateGlobal([['/', 'page']])] },
  fields: [
    { name: 'heroTitle', label: 'Заголовок', type: 'text', required: true, maxLength: 90 },
    { name: 'heroSubtitle', label: 'Подзаголовок', type: 'textarea', required: true, maxLength: 220 },
    { name: 'heroImage', label: 'Фото первого экрана', type: 'upload', relationTo: 'media', required: true },
    { name: 'audiences', label: 'Для кого (3 карточки)', type: 'array', minRows: 3, maxRows: 3, fields: [
      { name: 'title', type: 'text', required: true, maxLength: 40 },
      { name: 'text', type: 'textarea', required: true, maxLength: 200 },
      { name: 'href', type: 'text', required: true, admin: { description: 'Внутренний путь, например /goszakazchikam' } },
    ] },
    { name: 'productionText', label: 'Текст блока «Производство»', type: 'textarea', maxLength: 500 },
    { name: 'productionImages', label: 'Фото блока «Производство»', type: 'upload', relationTo: 'media', hasMany: true, maxRows: 4 },
    { name: 'steps', label: 'Как работаем', type: 'array', minRows: 3, maxRows: 6, fields: [
      { name: 'title', type: 'text', required: true, maxLength: 40 },
      { name: 'text', type: 'textarea', maxLength: 160 },
    ] },
    { name: 'showPartners', label: 'Показывать блок «Партнёры»', type: 'checkbox', defaultValue: false },
  ],
}
```

### 2.12 payload.config.ts

```ts
import path from 'node:path'
import { buildConfig } from 'payload'
import { postgresAdapter } from '@payloadcms/db-postgres'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import { nodemailerAdapter } from '@payloadcms/email-nodemailer'
import { seoPlugin } from '@payloadcms/plugin-seo'
import { ru } from '@payloadcms/translations/languages/ru'
import sharp from 'sharp'
import { Users } from './collections/Users'
import { Media } from './collections/Media'
import { ProductImages } from './collections/ProductImages'
import { Files } from './collections/Files'
import { Directions } from './collections/Directions'
import { Categories } from './collections/Categories'
import { Products } from './collections/Products'
import { Projects } from './collections/Projects'
import { Documents } from './collections/Documents'
import { Partners } from './collections/Partners'
import { Pages } from './collections/Pages'
import { Leads } from './collections/Leads'
import { SiteSettings } from './globals/SiteSettings'
import { HomePage } from './globals/HomePage'

const SITE = process.env.NEXT_PUBLIC_SITE_URL!

export default buildConfig({
  serverURL: SITE,
  secret: process.env.PAYLOAD_SECRET!,
  admin: { user: Users.slug, meta: { titleSuffix: ' — управление сайтом' } },
  i18n: { supportedLanguages: { ru }, fallbackLanguage: 'ru' },
  collections: [Users, Media, ProductImages, Files, Directions, Categories, Products, Projects, Documents, Partners, Pages, Leads],
  globals: [SiteSettings, HomePage],
  editor: lexicalEditor(),
  db: postgresAdapter({
    idType: 'uuid',
    pool: { connectionString: process.env.DATABASE_URI! },
    migrationDir: path.resolve(process.cwd(), 'src/migrations'),
    push: false, // схема меняется только миграциями
  }),
  email: nodemailerAdapter({
    defaultFromAddress: process.env.SMTP_FROM!,
    defaultFromName: process.env.SMTP_FROM_NAME!,
    transportOptions: {
      host: 'smtp.yandex.ru', port: 465, secure: true,
      auth: { user: process.env.SMTP_USER!, pass: process.env.SMTP_PASS! },
    },
  }),
  sharp,
  upload: { limits: { fileSize: 20 * 1024 * 1024 } },
  cors: [SITE],
  csrf: [SITE],
  plugins: [
    seoPlugin({
      collections: ['directions', 'categories', 'products', 'projects', 'pages'],
      uploadsCollection: 'media',
      tabbedUI: true,
      generateTitle: ({ doc }) => `${(doc as { title?: string }).title ?? ''} — ${process.env.NEXT_PUBLIC_COMPANY_SHORT}`,
    }),
  ],
  typescript: { outputFile: path.resolve(process.cwd(), 'src/payload-types.ts') },
})
```

### 2.13 Ручная миграция (после первой автоматической)

`src/migrations/20261001_000001_lead_seq_and_search.ts`
```ts
import { type MigrateDownArgs, type MigrateUpArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`CREATE SEQUENCE IF NOT EXISTS lead_number_seq START WITH 1001;`)
  await db.execute(sql`CREATE EXTENSION IF NOT EXISTS pg_trgm;`)
  // ускоряет поиск ILIKE '%...%' по названию и артикулу
  await db.execute(sql`CREATE INDEX IF NOT EXISTS products_title_trgm ON products USING gin (title gin_trgm_ops);`)
  await db.execute(sql`CREATE INDEX IF NOT EXISTS products_sku_trgm ON products USING gin (sku gin_trgm_ops);`)
  await db.execute(sql`CREATE INDEX IF NOT EXISTS projects_title_trgm ON projects USING gin (title gin_trgm_ops);`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`DROP INDEX IF EXISTS projects_title_trgm;`)
  await db.execute(sql`DROP INDEX IF EXISTS products_sku_trgm;`)
  await db.execute(sql`DROP INDEX IF EXISTS products_title_trgm;`)
  await db.execute(sql`DROP SEQUENCE IF EXISTS lead_number_seq;`)
}
```
Индексы по полям с `index: true` (slug, sku, direction, category, status, year, validUntil, phone, dedupeKey) Payload создаёт в автоматической миграции.

---
## БЛОК 3: API Endpoints

### 3.0 Общие правила
- Публичные эндпоинты — Next.js route handlers в `src/app/(frontend)/api/public/*/route.ts`, внутренние — в `src/app/(frontend)/api/internal/*/route.ts`. Статические пути Next.js имеют приоритет над catch-all `(payload)/api/[...slug]`, поэтому конфликта с REST Payload нет. Имена коллекций `public` и `internal` запрещены.
- Все ответы — JSON, `Content-Type: application/json; charset=utf-8`.
- Успех: `{ "data": ..., "meta"?: {...} }`. Ошибка: `{ "error": { "code": "UPPER_SNAKE", "message": "Текст для пользователя на русском", "fields"?: { "поле": "текст" } } }`.
- Каждый handler обёрнут в `try/catch`; неизвестная ошибка → 500 `INTERNAL_ERROR`, стек пишется в лог (`console.error` с `requestId`), клиенту стек не отдаётся.
- Каждый ответ содержит заголовок `X-Request-Id` (UUID v4).
- Страницы сайта не ходят в HTTP API: они читают данные на сервере через `src/lib/queries.ts` (раздел 3.5).

### 3.1 `POST /api/public/leads`
**Описание:** приём заявки с любой формы сайта.
**Авторизация:** публичный. Защита: rate limit 5 запросов / 10 минут на IP, Яндекс SmartCaptcha, honeypot-поле `website`, дедупликация 60 секунд.
**Файл:** `src/app/(frontend)/api/public/leads/route.ts`

**Zod-схема** (`src/lib/schemas.ts`):
```ts
import { z } from 'zod'
import { isValidInn, normalizeRuPhone } from './validators'

const optText = (max: number) =>
  z.string().trim().max(max).optional().transform((v) => (v ? v : undefined))

export const leadSchema = z
  .object({
    type: z.enum(['callback', 'quote', 'calculation']),
    name: z.string().trim().min(2, 'Введите имя').max(80, 'Не больше 80 символов'),
    phone: z.string().trim().transform((v, ctx) => {
      const n = normalizeRuPhone(v)
      if (!n) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Введите телефон в формате +7 900 000-00-00' })
        return z.NEVER
      }
      return n
    }),
    email: z.union([z.literal(''), z.string().trim().email('Неверный email').max(120)]).optional()
      .transform((v) => (v ? v : undefined)),
    organization: optText(150),
    inn: optText(12).refine((v) => !v || isValidInn(v), 'Неверный ИНН'),
    region: optText(100),
    productId: z.string().uuid().optional(),
    directionId: z.string().uuid().optional(),
    quantity: z.coerce.number().int('Целое число').min(1, 'Минимум 1').max(100000, 'Не больше 100 000').optional(),
    message: optText(2000),
    consent: z.literal(true, { errorMap: () => ({ message: 'Нужно согласие на обработку персональных данных' }) }),
    consentVersion: z.string().min(1).max(20),
    captchaToken: z.string().min(10, 'Подтвердите, что вы не робот'),
    sourceUrl: z.string().url().max(500),
    utm: z.record(z.string().max(200)).optional(),
    website: z.string().max(0).optional(), // honeypot: у людей всегда пустое
  })
  .superRefine((d, ctx) => {
    if (d.type === 'quote' && !d.productId && !d.message) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['message'], message: 'Укажите изделие или опишите запрос' })
    }
    if (d.type === 'calculation') {
      if (!d.directionId) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['directionId'], message: 'Выберите направление' })
      if (!d.message || d.message.length < 20)
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['message'], message: 'Опишите задачу — минимум 20 символов' })
    }
  })

export type LeadInput = z.infer<typeof leadSchema>
```

**Алгоритм обработчика (строго в этом порядке):**
0. Если заголовок `Origin` есть и не равен `NEXT_PUBLIC_SITE_URL` → 403 `FORBIDDEN_ORIGIN`.
1. Получить IP из заголовка `X-Real-IP` (его ставит Caddy), иначе `X-Forwarded-For` (первый адрес), иначе `0.0.0.0`.
2. `rateLimit('leads', ip, 5, 600_000)`. Превышение → 429 `RATE_LIMITED`.
3. `await req.json()` в try/catch. Ошибка → 400 `INVALID_JSON`.
4. Если `body.website` — непустая строка → вернуть 201 `{ "data": { "number": null } }`, ничего не сохранять (бот не должен понять, что его отсекли).
5. `leadSchema.safeParse(body)`. Ошибка → 400 `VALIDATION_ERROR` с `fields` (первая ошибка для каждого пути).
6. Капча. Если `captchaToken` начинается с `unavailable-` (скрипт капчи не загрузился у посетителя) → `rateLimit('captcha-bypass', ip, 2, 3_600_000)`, превышение → 400 `CAPTCHA_FAILED`, иначе продолжить. Иначе `verifyCaptcha(captchaToken, ip)`: ответ `status !== 'ok'` → 400 `CAPTCHA_FAILED`; таймаут или сетевая ошибка сервиса → пропустить проверку. В обоих случаях пропуска записать в лог `captcha_unavailable` с IP (заявка важнее; от флуда защищают rate limit и honeypot).
7. Если есть `productId` — `payload.findByID` товара с `_status = published`; нет → 404 `PRODUCT_NOT_FOUND`. Если есть `directionId` — то же для направления → 404 `DIRECTION_NOT_FOUND`. Если есть товар, а `directionId` не передан — взять направление из товара.
8. `dedupeKey = sha256([phone, type, productId ?? '', directionId ?? '', (message ?? '').slice(0, 200)].join('|'))`. Найти заявку с этим ключом и `createdAt > now − 60 с`. Найдена → 200 с её номером, новую не создавать.
9. `number = await nextLeadNumber(payload)`, `payload.create({ collection: 'leads', overrideAccess: true, data: {...} })` c `consentAt = new Date().toISOString()`, `ip`, `userAgent` (первые 300 символов), `notifications` = все `pending` (или `skipped` для каналов без настроек).
10. Зарегистрировать отправку уведомлений через `after(() => notifyLead(leadId))` из `next/server` — посетитель не ждёт мессенджеров.
11. Вернуть 201.

**Запрос (запрос КП из карточки):**
```json
{
  "type": "quote",
  "name": "Ольга Сергеевна",
  "phone": "8 (916) 555-12-34",
  "email": "o.sergeevna@stroyinvest-m.ru",
  "organization": "ООО «СтройИнвест-М»",
  "inn": "7724553108",
  "region": "Москва",
  "productId": "5f1c2a7e-3b0d-4c8a-9f61-2d7e8b4a1c90",
  "quantity": 40,
  "message": "Нужна поставка до 15 ноября, двор ЖК на Варшавском шоссе",
  "consent": true,
  "consentVersion": "2026-10-01",
  "captchaToken": "dD0xNzI3NjkwMDAwO2k9MTg1LjIyLjE0LjU7...",
  "sourceUrl": "https://example-zavod.ru/produkciya/maf/skamejki/skamejka-bez-spinki-sk-014",
  "utm": { "utm_source": "yandex", "utm_medium": "cpc", "utm_campaign": "maf_moskva" },
  "website": ""
}
```

**Запрос (расчёт по услуге):**
```json
{
  "type": "calculation",
  "name": "Андрей Викторович",
  "phone": "+7 903 111-22-33",
  "organization": "ГБУ «Жилищник района Южное Бутово»",
  "directionId": "a3e9b1c4-77d2-4f0e-8b35-6c1d9e2f4a07",
  "message": "Требуются тепловые узлы для трёх жилых домов, нагрузка до 0,5 Гкал/ч каждый, монтаж в 2027 году",
  "consent": true,
  "consentVersion": "2026-10-01",
  "captchaToken": "dD0xNzI3NjkwMTIzO2k9OTEuMjAzLjEwLjI7...",
  "sourceUrl": "https://example-zavod.ru/produkciya/teplovye-uzly"
}
```

**Ответ 201:**
```json
{
  "data": {
    "number": 1042,
    "message": "Заявка №1042 принята. Ответим в рабочее время в течение 1 часа"
  }
}
```

**Ответ 200 (дубль в течение 60 секунд):**
```json
{ "data": { "number": 1042, "message": "Заявка №1042 уже принята. Ответим в рабочее время в течение 1 часа", "duplicate": true } }
```

**Ответ 400 (валидация):**
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Проверьте выделенные поля",
    "fields": {
      "phone": "Введите телефон в формате +7 900 000-00-00",
      "consent": "Нужно согласие на обработку персональных данных"
    }
  }
}
```

**Ответ 400 (капча):** `{ "error": { "code": "CAPTCHA_FAILED", "message": "Проверка «я не робот» не пройдена. Попробуйте ещё раз" } }`
**Ответ 400 (JSON):** `{ "error": { "code": "INVALID_JSON", "message": "Некорректный запрос" } }`
**Ответ 404:** `{ "error": { "code": "PRODUCT_NOT_FOUND", "message": "Изделие не найдено. Возможно, оно снято с публикации" } }`
**Ответ 403:** `{ "error": { "code": "FORBIDDEN_ORIGIN", "message": "Запрос отклонён" } }`
**Ответ 429:** `{ "error": { "code": "RATE_LIMITED", "message": "Слишком много заявок подряд. Попробуйте через 10 минут или позвоните: +7 985 975-03-50" } }` + заголовок `Retry-After: 600`
**Ответ 500:** `{ "error": { "code": "INTERNAL_ERROR", "message": "Не удалось отправить заявку. Позвоните нам: +7 985 975-03-50" } }`

Телефон в текстах 429 и 500 берётся из основного телефона `site-settings`, а не хардкодится.

### 3.2 `GET /api/public/search`
**Описание:** живой поиск в шапке.
**Авторизация:** публичный. Rate limit 60 запросов / минута на IP.
**Параметры:** `q` (string, 2–60 символов после trim), `limit` (int 1–20, по умолчанию 8).

**Zod-схема:**
```ts
export const searchSchema = z.object({
  q: z.string().trim().min(2, 'Минимум 2 символа').max(60),
  limit: z.coerce.number().int().min(1).max(20).default(8),
})
```

**Логика:** параллельно (`Promise.all`) через `queries.ts`:
товары (`_status = published`, `or: [{ title: { like: q } }, { sku: { like: q } }]`, limit), категории (`title like q`, 5), направления (`title like q`, 5), объекты (`published`, `title like q`, 5). Порядок в ответе: товары с точным совпадением артикула (без учёта регистра) → остальные товары → категории → направления → объекты. Обрезать до `limit`. `meta.total` — сумма `totalDocs` всех четырёх запросов.

**Запрос:** `GET /api/public/search?q=ск-01&limit=8`

**Ответ 200:**
```json
{
  "data": [
    {
      "type": "product",
      "title": "Скамейка без спинки",
      "subtitle": "СК-014 · Скамейки",
      "url": "/produkciya/maf/skamejki/skamejka-bez-spinki-sk-014",
      "image": "/api/product-images/file/skamejka-bez-spinki-1-480x360.webp"
    },
    {
      "type": "product",
      "title": "Скамейка со спинкой «Линия»",
      "subtitle": "СК-017 · Скамейки",
      "url": "/produkciya/maf/skamejki/skamejka-so-spinkoj-liniya",
      "image": "/api/product-images/file/skamejka-liniya-1-480x360.webp"
    },
    {
      "type": "category",
      "title": "Скамейки",
      "subtitle": "Малые архитектурные формы",
      "url": "/produkciya/maf/skamejki",
      "image": null
    }
  ],
  "meta": { "q": "ск-01", "total": 3 }
}
```

**Ответ 200 (ничего не найдено):** `{ "data": [], "meta": { "q": "бассейн", "total": 0 } }`
**Ответ 400:** `{ "error": { "code": "VALIDATION_ERROR", "message": "Минимум 2 символа", "fields": { "q": "Минимум 2 символа" } } }`
**Ответ 429:** `{ "error": { "code": "RATE_LIMITED", "message": "Слишком много запросов. Подождите минуту" } }`
**Ответ 500:** `{ "error": { "code": "INTERNAL_ERROR", "message": "Поиск временно недоступен" } }`

Ответ кэшируется: `Cache-Control: public, max-age=60`.

### 3.3 `GET /api/public/health`
**Описание:** проверка для мониторинга (UptimeRobot или аналог, опрос раз в 5 минут).
**Авторизация:** публичный. Выполняет `SELECT 1` через `payload.db.drizzle`.

**Ответ 200:** `{ "data": { "status": "ok", "db": "ok", "time": "2026-10-14T09:15:02.311Z", "version": "1.0.0" } }`
**Ответ 503:** `{ "error": { "code": "DB_UNAVAILABLE", "message": "База данных недоступна" } }`

### 3.4 `POST /api/internal/retry-notifications`
**Описание:** повторная отправка уведомлений по заявкам, у которых хотя бы один канал в статусе `failed` или `pending`, `notifications.attempts < 5` и `createdAt` не старше 24 часов. Вызывается системным cron на VPS каждые 10 минут.
**Авторизация:** заголовок `Authorization: Bearer ${INTERNAL_CRON_SECRET}`; сравнение через `crypto.timingSafeEqual`.
**Тело:** пустое.

**Ответ 200:** `{ "data": { "processed": 3, "sent": 2, "failed": 1 } }`
**Ответ 401:** `{ "error": { "code": "UNAUTHORIZED", "message": "Неверный ключ" } }`
**Ответ 500:** `{ "error": { "code": "INTERNAL_ERROR", "message": "Ошибка при повторной отправке" } }`

Строка crontab на хосте (порт приложения опубликован только на 127.0.0.1, раздел 5.9): `*/10 * * * * . /opt/site/.env && curl -fsS -X POST -H "Authorization: Bearer $INTERNAL_CRON_SECRET" http://127.0.0.1:3000/api/internal/retry-notifications >> /var/log/retry-notify.log 2>&1`. Снаружи путь `/api/internal/*` закрыт в Caddy (отдаёт 404).

### 3.4a `POST /api/internal/documents-expiry`
**Описание:** еженедельно (понедельник 09:00 МСК) отправляет на `notifyEmails` письмо со списком документов, у которых `validUntil` наступает в ближайшие 30 дней или уже прошёл. Если таких нет — письмо не отправляется.
**Авторизация:** как 3.4.

**Ответ 200:** `{ "data": { "expiring": [ { "title": "Сертификат соответствия на скамейки", "validUntil": "2026-11-02" } ], "emailSent": true } }`
**Ответ 401:** `{ "error": { "code": "UNAUTHORIZED", "message": "Неверный ключ" } }`
**Ответ 500:** `{ "error": { "code": "INTERNAL_ERROR", "message": "Ошибка проверки документов" } }`

### 3.5 Серверные запросы страниц (`src/lib/queries.ts`)

Все функции: серверные (`import 'server-only'`), обёрнуты в `React.cache`, получают клиент через `getPayloadClient()` (`getPayload({ config })`, кэшируется в модуле). Для `products` и `projects` всегда `draft: false` и `where._status = published`.

| Функция | Возвращает | Условия |
|---|---|---|
| `getSiteSettings()` | `SiteSettings` (без полей уведомлений) | `overrideAccess: false` |
| `getHomePage()` | `HomePage`, depth 1 | |
| `getDirections()` | `Direction[]` | sort `order`, depth 1 |
| `getDirectionBySlug(slug)` | `Direction \| null` | |
| `getCategoriesByDirection(directionId)` | `Category[]` + `productCount` у каждой | sort `order` |
| `getCategoryBySlugs(directionSlug, categorySlug)` | `{ direction, category } \| null` | категория должна принадлежать направлению, иначе `null` → 404 |
| `getProducts({ categoryId, page })` | `{ docs: Product[], totalDocs, page, totalPages }` | 24 на страницу, sort `order`, затем `title` |
| `getProductBySlugs(dir, cat, slug)` | `Product \| null`, depth 2 | все три slug должны совпадать с реальной иерархией |
| `getFeaturedProducts(limit = 8)` | `Product[]` | `featured = true` |
| `getProjects({ directionSlug?, page })` | пагинированный список | 12 на страницу, sort `-year` |
| `getProjectBySlug(slug)` | `Project \| null`, depth 2 | если `showCustomer = false`, поле `customerName` удаляется из объекта до возврата |
| `getProjectsByDirection(directionId, limit = 6)` | `Project[]` | |
| `getFeaturedProjects(limit = 6)` | `Project[]` | `featured = true`; если меньше 3 — добрать последними по году |
| `getDocuments({ directionId?, onlyHome? })` | `Document[]` | исключить `validUntil < сегодня (Europe/Moscow)` |
| `getPage(slug)` | `Page \| null` | slug ∈ `PAGE_SLUGS` |
| `getActivePartners()` | `Partner[]` | `active = true` |
| `searchAll(q, limit)` | как в 3.2 | |

Пример ответа `getProductBySlugs('maf', 'skamejki', 'skamejka-bez-spinki-sk-014')` (сокращены служебные поля Payload):
```json
{
  "id": "5f1c2a7e-3b0d-4c8a-9f61-2d7e8b4a1c90",
  "title": "Скамейка без спинки",
  "slug": "skamejka-bez-spinki-sk-014",
  "sku": "СК-014",
  "direction": { "id": "0b6f...", "title": "Малые архитектурные формы", "slug": "maf" },
  "category": { "id": "7c21...", "title": "Скамейки", "slug": "skamejki" },
  "shortDescription": "Стальной каркас с фаской на торцах, сиденье из тонированной сосны. Для дворов, парков и школ.",
  "gallery": [
    { "id": "e1...", "alt": "Скамейка СК-014, вид спереди", "url": "/api/product-images/file/sk-014-1.webp",
      "sizes": { "thumb": { "url": "/api/product-images/file/sk-014-1-480x320.webp" }, "card": { "url": "/api/product-images/file/sk-014-1-960x640.webp" } } }
  ],
  "drawing": null,
  "lengthMm": 1500, "widthMm": 450, "heightMm": 450, "weightKg": 38.5,
  "materials": [{ "material": "Сталь, лист 4 мм" }, { "material": "Сосна, брус 45×95 мм" }],
  "coating": "Порошковая окраска, RAL 9005; дерево — масло-воск, цвет «орех»",
  "productionDaysMin": 10, "productionDaysMax": 15,
  "warrantyMonths": 24,
  "okpd2": "31.01.12.160",
  "inGispRegistry": false,
  "attributes": [
    { "key": "seats_count", "label": "Посадочных мест", "unit": "шт", "value": "3" },
    { "key": "has_backrest", "label": "Спинка", "unit": "", "value": "Нет" },
    { "key": "wood_species", "label": "Порода дерева", "unit": "", "value": "Сосна" },
    { "key": "mounting", "label": "Способ установки", "unit": "", "value": "Анкерное крепление к основанию" }
  ],
  "relatedProducts": [],
  "_status": "published",
  "updatedAt": "2026-10-20T11:02:44.100Z"
}
```

### 3.6 REST API Payload (`/api/{collection}`)
Используется только админкой. Не расширять, не вызывать с фронтенда. Доступ определяют `access`-правила из блока 2. Гость может читать опубликованные товары и объекты и публичные коллекции через REST — это допустимо, данные и так публичны; `leads` и поля уведомлений `site-settings` закрыты.

---
## БЛОК 4: UI/UX

### 4.0 Дизайн-система

**Стиль:** чёрно-белый (решение клиента). Цвет на сайте дают только фотографии. Никаких градиентов, цветных плашек и декоративных иллюстраций.

**Токены** (`src/app/(frontend)/globals.css`, Tailwind v4 `@theme`):
```css
@import "tailwindcss";

@theme {
  --color-bg: #ffffff;
  --color-fg: #111111;
  --color-muted: #f4f4f4;
  --color-muted-fg: #6b6b6b;
  --color-border: #e2e2e2;
  --color-inverse-bg: #111111;
  --color-inverse-fg: #ffffff;
  --color-success: #1f7a3a;   /* только иконки и текст статуса успеха */
  --color-danger: #b42318;    /* только ошибки форм */
  --font-sans: "Inter", "Arial", sans-serif;
  --font-display: "Manrope", "Arial", sans-serif;
  --radius-card: 4px;
}
```
- Шрифты Inter (текст) и Manrope (заголовки), начертания 400/500/700, наборы latin + cyrillic, файлы woff2 в `public/fonts/`, подключение через `next/font/local` с `display: 'swap'`.
- Кнопки: основная — чёрный фон, белый текст; вторичная — белый фон, чёрная рамка 1 px. Высота 44 px (минимальная зона касания на мобильных). Радиус 4 px.
- Сетка: контейнер `max-w-[1280px] mx-auto px-4 md:px-6 lg:px-8`. Брейкпоинты: мобильный < 768 px, планшет 768–1023 px, десктоп ≥ 1024 px.
- Фото товаров в списках — соотношение 4:3, `object-contain` на фоне `--color-muted` (чтобы разные по формату фото выглядели ровно). Фото объектов — 16:10, `object-cover`.
- Все изображения через `next/image` с `sizes`, первые изображения первого экрана — `priority`.
- Числа в «Цифрах» — Manrope 700, 48 px на десктопе, 36 px на мобильном.
- Форматирование: габариты `1500 × 450 × 450 мм` (неразрывные пробелы), сроки `10–15 рабочих дней`, телефон `+7 985 975-03-50`, дата `14.10.2026`.

**Компоненты shadcn/ui:** Button, Card, Badge, Breadcrumb, Dialog, Sheet, Tabs, Input, Textarea, Checkbox, Select, Label, Skeleton, Separator, Table, Pagination, Sonner (toast), NavigationMenu, Command (поиск), AspectRatio, Carousel.

**Иконки lucide-react:** `Phone`, `Mail`, `Send` (Telegram), `MessageCircle` (MAX, WhatsApp), `Search`, `Menu`, `X`, `ChevronRight`, `ChevronLeft`, `ArrowRight`, `Download`, `FileText`, `FileCheck2` (документы), `MapPin`, `Clock`, `Factory`, `ShieldCheck`, `Ruler`, `Weight`, `CalendarClock`, `BadgeCheck` (реестр), `Building2`, `HardHat`, `PencilRuler`, `Loader2`, `CheckCircle2`, `AlertCircle`, `ImageOff`.

### 4.1 Общий layout (`app/(frontend)/layout.tsx`)

**Header** (sticky, белый фон, нижняя граница 1 px):
- Слева: логотип (`site-settings.logo`), если его нет — `companyName` шрифтом Manrope 700 20 px и `tagline` 12 px под ним.
- Центр (десктоп): NavigationMenu — «Продукция» (выпадающая панель: 7 направлений в 2 колонки, у каждого `title` и `shortDescription`), «Объекты», «О компании» (выпадающее: О компании, Производство, Документы, Доставка и оплата, Гарантия), «Госзаказчикам», «Контакты».
- Справа: кнопка-иконка `Search` (открывает CommandDialog поиска), основной телефон ссылкой `tel:` (скрыт < 1024 px), кнопка «Запросить КП»: на карточке товара открывает LeadDialog `quote` с этим товаром, на страницах направлений-услуг — `calculation` с направлением, на остальных страницах — `callback`.
- Мобильный (< 1024 px): логотип, `Search`, `Phone` (иконка, `tel:`), `Menu` → Sheet справа на всю высоту: пункты меню аккордеоном, внизу телефон, мессенджеры, кнопка «Запросить КП».

**Footer** (фон `--color-inverse-bg`, текст белый):
- Колонка 1: название, `tagline`, телефоны, email, мессенджеры (иконки со ссылками, только заполненные в `site-settings`), режим работы.
- Колонка 2: направления (7 ссылок).
- Колонка 3: Объекты, О компании, Производство, Документы, Госзаказчикам, Доставка и оплата, Гарантия, Контакты.
- Колонка 4: реквизиты — полное наименование, ИНН, КПП, ОГРН, юридический адрес, фактический адрес производства.
- Нижняя строка: «© 2026 {legalName}», ссылки «Политика обработки ПДн», «Согласие на обработку ПДн», «Cookie».
- Мобильный: колонки друг под другом, колонки 2 и 3 свёрнуты в аккордеон.

**Breadcrumbs:** на всех страницах, кроме главной. Разметка `BreadcrumbList` в JSON-LD.

**CookieBanner:** фиксирован внизу, показывается, пока в `localStorage['cookie-consent']` нет значения. Текст: «Мы используем cookie и Яндекс Метрику, чтобы улучшать сайт. Подробнее — в политике cookie». Кнопки «Принять» (сохраняет `all`, загружает Метрику) и «Только необходимые» (сохраняет `necessary`, Метрика не загружается). Мобильный — на всю ширину, кнопки в столбик.

**Глобальные состояния:**
- `loading.tsx` на уровне каждого сегмента: скелетоны конкретной страницы (ниже).
- `error.tsx`: иконка `AlertCircle`, «Не удалось загрузить страницу», кнопки «Обновить» (`reset()`) и «На главную», телефон для связи.
- `not-found.tsx`: «Страница не найдена», поле поиска, ссылки на «Продукция» и «Контакты».

### 4.2 Экран: Главная
**Путь:** `/` | **Layout:** Full-width секции
**Данные:** `getHomePage`, `getSiteSettings`, `getDirections`, `getFeaturedProjects(6)`, `getDocuments({ onlyHome: true })`, `getActivePartners`.

**Секции по порядку:**
1. **Hero:** слева `heroTitle` (h1, 48/36 px), `heroSubtitle`, кнопки «Каталог продукции» (→ `/produkciya`) и «Запросить КП» (LeadDialog `callback`); справа `heroImage` 4:3. Мобильный: фото под текстом.
2. **Facts:** до 4 карточек из `site-settings.facts` в строку (мобильный — сетка 2×2). Если `facts` пуст — секция не рендерится.
3. **Directions:** сетка карточек направлений (десктоп 4 колонки / планшет 2 / мобильный 1): обложка 4:3, название, `shortDescription`, стрелка `ArrowRight`. Клик → `/produkciya/[slug]`.
4. **Audiences:** 3 карточки из `home-page.audiences` с иконками `Building2` (госзаказчики), `HardHat` (подрядчики), `PencilRuler` (проектировщики) по порядку.
5. **Production:** текст `productionText` + до 4 фото `productionImages`, кнопка «О производстве» → `/proizvodstvo`. Если нет ни текста, ни фото — не рендерится.
6. **Projects:** «Объекты» — до 6 карточек (обложка, название, город, год), кнопка «Все объекты». Если объектов < 3 — секция не рендерится.
7. **Documents:** до 6 документов с `showOnHome`: превью или иконка `FileCheck2`, название, тип. Если `gispNote` заполнен — плашка с `BadgeCheck` и этим текстом. Кнопка «Все документы».
8. **Steps:** «Как мы работаем» — шаги из `home-page.steps` с номерами 01, 02….
9. **Partners:** только если `showPartners` и есть активные партнёры — строка логотипов в градациях серого.
10. **CTA-форма:** «Расскажите о задаче — подготовим КП», встроенная LeadForm `callback` (не диалог): имя, телефон, организация, комментарий, согласие. Справа — основной телефон, email, мессенджеры, `responseTimePromise`.

**Состояния:**
- **Loading:** скелетоны: блок 2 колонки для hero, 4 прямоугольника фактов, 8 карточек направлений.
- **Empty:** секции без данных не рендерятся (правила выше). Если нет ни одного направления (только до seed) — вместо сетки текст «Каталог наполняется» и кнопка «Позвонить».
- **Error:** `error.tsx` (4.1). Ошибка отправки CTA-формы — inline под кнопкой (4.14).

**Действия:**
1. Клик «Каталог продукции» → `/produkciya`.
2. Клик «Запросить КП» → LeadDialog `callback`.
3. Клик по карточке направления → страница направления.
4. Отправка CTA-формы → `POST /api/public/leads` → экран успеха внутри блока.

**Responsive:** описано по секциям; на мобильном все сетки в 1 колонку, кроме Facts (2×2).

### 4.3 Экран: Все направления
**Путь:** `/produkciya` | **Layout:** Container
**Компоненты:** Breadcrumbs, h1 «Продукция и услуги», два блока: «Изделия» (направления `catalog`) и «Работы под заказ» (направления `service`), в каждом — сетка DirectionCard (как на главной). Под сеткой — баннер «Нужна продукция по вашим чертежам? Изготовим» + кнопка LeadDialog `callback`. Если `catalogPdf` загружен — кнопка «Скачать каталог PDF» (`Download`).
- **Loading:** 8 скелетон-карточек 4:3.
- **Empty:** если в блоке нет направлений — блок скрыт.
- **Error:** `error.tsx`.
- **Действия:** клик по карточке → направление; «Скачать каталог PDF» → файл открывается в новой вкладке, цель Метрики `download_catalog`.
- **Responsive:** 4 / 2 / 1 колонки.

### 4.4 Экран: Направление типа «каталог»
**Путь:** `/produkciya/[direction]` (если `type = catalog`) | **Layout:** Container
**Компоненты:** Breadcrumbs; h1 = `title`; `heroText`; сетка CategoryCard (обложка категории или первое фото первого товара, название, «{N} моделей»); блок «Объекты с этой продукцией» (до 6, `getProjectsByDirection`); блок «Документы» (`getDocuments({ directionId })`); `description` (richText, SEO-текст) внизу; CTA «Не нашли нужное? Изготовим по вашему ТЗ» + LeadDialog `quote`.
- **Loading:** скелетон заголовка + 6 карточек.
- **Empty:** нет категорий → Card с иконкой `Factory`: «Каталог направления наполняется. Оставьте запрос — пришлём актуальный перечень изделий» + кнопка LeadDialog `quote` с этим направлением. Блоки объектов и документов без данных скрыты.
- **Error:** `error.tsx`. Неизвестный slug → `notFound()`.
- **Действия:** клик по категории → `/produkciya/[direction]/[category]`.
- **Responsive:** 3 / 2 / 1 колонки категорий.

### 4.5 Экран: Направление типа «услуга»
**Путь:** `/produkciya/[direction]` (если `type = service`) | **Layout:** Full-width секции
**Компоненты:** Breadcrumbs; Hero: h1, `heroText`, обложка, кнопка «Запросить расчёт» (LeadDialog `calculation` с `directionId`); «Что делаем» — `service.workScope` списком с иконкой `CheckCircle2` в 2 колонки; «Для каких объектов» — `objectTypes` Badge-ами; «Этапы работы» — `stages` горизонтальным таймлайном (мобильный — вертикальным); «Реализованные объекты» (до 6); «Документы и допуски»; `description`; финальная LeadForm `calculation` встроенная, над полем «Описание задачи» — `service.formHint`.
- **Loading:** скелетон hero + 3 блока.
- **Empty:** пустые массивы → соответствующие блоки не рендерятся. Если нет объектов — блок заменяется строкой «Покажем примеры работ по запросу».
- **Error:** `error.tsx`.
- **Действия:** «Запросить расчёт» → LeadDialog; отправка встроенной формы → успех на месте формы.
- **Responsive:** таймлайн этапов горизонтальный ≥ 1024 px, иначе вертикальный.

### 4.6 Экран: Категория
**Путь:** `/produkciya/[direction]/[category]?page=N` | **Layout:** Container
**Компоненты:** Breadcrumbs; h1 = категория; `shortDescription`; счётчик «{totalDocs} моделей»; сетка ProductCard: фото 4:3 (первое из `gallery`), артикул (Badge, моноширинный), название, габариты `Д × Ш × В мм` с иконкой `Ruler`, кнопки «Подробнее» (ссылка) и «Запросить КП» (LeadDialog `quote` с товаром); Pagination (24 на страницу); `description` внизу.
- **Loading:** 12 скелетон-карточек (прямоугольник 4:3 + 3 строки).
- **Empty:** «В этой категории пока нет опубликованных моделей» + кнопка «Запросить каталог» (LeadDialog `quote` с `message` = «Прошу прислать перечень изделий категории {название}»).
- **Error:** `error.tsx`; `page` больше `totalPages` или не число → `redirect` на `?page=1`.
- **Действия:** клик по карточке → карточка товара; «Запросить КП» → LeadDialog; пагинация → `?page=N` с прокруткой вверх.
- **Responsive:** 4 / 3 (планшет альбомный) / 2 / 1 колонки: ≥1280 — 4, ≥1024 — 3, ≥640 — 2, иначе 1.

### 4.7 Экран: Карточка товара
**Путь:** `/produkciya/[direction]/[category]/[product]` | **Layout:** Container, 2 колонки (галерея 7/12, информация 5/12)
**Компоненты:**
- Breadcrumbs (4 уровня) + ссылка «← назад в „{категория}“».
- **ProductGallery:** Tabs «Фото» / «Чертёж» (вкладка «Чертёж» только если есть `drawing`). Главное фото 4:3 + миниатюры (до 12) под ним. Клик по фото → Dialog на весь экран с Carousel и свайпом. Если в `gallery` нет изображений (фото удалено) — плейсхолдер `ImageOff` на сером фоне.
- **Инфо-колонка:** Badge с артикулом; h1; `shortDescription`; блок ключевых параметров с иконками: габариты (`Ruler`), масса (`Weight`), срок изготовления (`CalendarClock`, «10–15 рабочих дней»), гарантия (`ShieldCheck`, «24 месяца»); если `inGispRegistry` — плашка `BadgeCheck` «В реестре российской промышленной продукции», номер записи; кнопки «Запросить КП» (основная, LeadDialog `quote` с товаром) и «Позвонить» (вторичная, `tel:`); строка `responseTimePromise`.
- **SpecTable** (Table, 2 колонки): Артикул, Габариты, Масса, Материалы (через запятую), Покрытие, Срок изготовления, Гарантия, ОКПД2, затем все `attributes` с непустым значением (`label` | `value unit`). Пустые строки не выводятся.
- `description` (richText).
- «Установлено на объектах» — проекты, где товар есть в `products` (до 4).
- «Похожие модели» — `relatedProducts`, если пусто — 4 других товара той же категории.
- JSON-LD `Product` (name, sku, image, description, brand = `companyName`, без `offers`).
- **Loading:** скелетон 4:3 слева, справа 6 строк текста и 2 кнопки, ниже таблица из 8 строк.
- **Empty:** нет `description` — блок не выводится; нет связанных объектов — блок скрыт; не заполнены срок/гарантия — соответствующая строка скрыта.
- **Error:** несовпадение иерархии slug (товар есть, но категория в URL другая) → `permanentRedirect` на правильный URL; товар не найден или черновик → `notFound()`.
- **Действия:** переключение вкладок; клик по миниатюре меняет главное фото; «Запросить КП» → LeadDialog с предзаполненным изделием и полем количества; клик «Позвонить» → `tel:` + цель `click_phone`.
- **Responsive:** < 1024 px — одна колонка: галерея, затем инфо; кнопка «Запросить КП» дублируется в фиксированной нижней панели (`fixed bottom-0`, белый фон, тень) при прокрутке ниже основной кнопки.

### 4.8 Экран: Объекты
**Путь:** `/obekty?direction=slug&page=N` | **Layout:** Container
**Компоненты:** Breadcrumbs; h1 «Объекты»; фильтр — горизонтальный ряд Button-ов «Все» + направления, у которых есть объекты (активная кнопка — основная); сетка ProjectCard: обложка 16:10, год и город (muted), название, `summary` (3 строки, обрезка), Badge-и направлений; Pagination (12).
- **Loading:** ряд из 5 скелетон-кнопок + 6 карточек 16:10.
- **Empty:** нет объектов вообще — «Раздел наполняется. Покажем примеры работ по запросу» + кнопка LeadDialog `callback`. Нет объектов по фильтру — «По этому направлению объекты скоро появятся» + кнопка «Показать все».
- **Error:** `error.tsx`; неизвестный `direction` → игнорировать фильтр.
- **Действия:** клик по фильтру → `?direction=slug` (без перезагрузки через `Link`); клик по карточке → объект.
- **Responsive:** 3 / 2 / 1; ряд фильтров прокручивается горизонтально на мобильном.

### 4.9 Экран: Объект
**Путь:** `/obekty/[slug]` | **Layout:** Container
**Компоненты:** Breadcrumbs; h1; строка параметров: `MapPin` город, год, заказчик (только если `showCustomer`), Badge-и направлений; обложка 16:10; `summary` крупным текстом; `description`; галерея (сетка 3 колонки, клик → Dialog с Carousel); «Использованные изделия» — ProductCard-ы; CTA «Нужен похожий объект?» + LeadDialog `callback` с `message` = «Интересует объект, похожий на „{title}“».
- **Loading:** скелетон обложки 16:10 и 4 строк.
- **Empty:** нет галереи → блок скрыт; нет изделий → блок скрыт.
- **Error:** не найден → `notFound()`.
- **Responsive:** галерея 3 / 2 / 1 колонки.

### 4.10 Экран: Документы
**Путь:** `/dokumenty` | **Layout:** Container
**Компоненты:** h1; группы по `docType` в порядке: реестр, сертификаты, декларации, СРО, лицензии, благодарственные письма, каталоги, другое; в группе — сетка карточек: превью (3:4, если есть; иначе `FileText`), название, номер, «Действует до 01.06.2028», кнопка «Открыть PDF» (`Download`, новая вкладка, цель `download_document`). Блок «Реквизиты» — таблица из `site-settings` + кнопка «Скачать карточку предприятия» (если файл загружен).
- **Loading:** 6 скелетон-карточек 3:4.
- **Empty:** нет документов — «Документы предоставим по запросу» + LeadDialog `callback` с `message` = «Прошу прислать документы на продукцию». Блок реквизитов показывается всегда.
- **Error:** `error.tsx`.
- **Responsive:** 4 / 3 / 2 колонки (на мобильном 2, карточки компактные).

### 4.11 Экран: Госзаказчикам
**Путь:** `/goszakazchikam` | **Layout:** Container
**Компоненты:** h1 из `pages`; `lead`; `content` (как работаем по 44-ФЗ и 223-ФЗ, пишет копирайтер); Table «ОКПД2 по направлениям» (направление | ОКПД2, только направления с заполненным `okpd2`); плашка ГИСП (если `gispNote`); «Документы» — первые 6 документов типов registry, certificate, declaration, sro, license; «Реквизиты» — таблица + кнопка карточки предприятия; CTA LeadDialog `quote`.
- **Loading:** скелетон текста и таблицы.
- **Empty:** нет ОКПД2 — таблица скрыта; нет документов — строка «Документы предоставим по запросу».
- **Error:** `error.tsx`.

### 4.12 Экраны: контентные страницы
**Пути:** `/o-kompanii`, `/proizvodstvo`, `/dostavka-i-oplata`, `/garantiya`, `/politika-konfidencialnosti`, `/soglasie-na-obrabotku`, `/cookie` | **Layout:** Container, колонка текста `max-w-3xl`
**Компоненты:** Breadcrumbs; h1; `lead`; обложка (если есть); `content` через `RichText` из `@payloadcms/richtext-lexical/react` с типографскими стилями (h2 28 px, h3 20 px, списки, таблицы в `overflow-x-auto`); `gallery` сеткой (для «Производства»). На «Гарантии» над текстом — плашка с `warrantyShort` из `site-settings`. На юридических страницах внизу — «Версия от {version}».
Дополнительно: `/o-kompanii` выводит Facts; `/proizvodstvo` — CTA «Приезжайте на производство» + адрес и карта (как на «Контактах»).
- **Loading:** скелетон заголовка и 8 строк.
- **Empty:** страница есть, `content` пустой (только после seed) — «Раздел скоро будет заполнен» + контакты. Записи в `pages` нет → `notFound()`.
- **Error:** `error.tsx`.

### 4.13 Экран: Контакты
**Путь:** `/kontakty` | **Layout:** Container, 2 колонки
**Компоненты:** h1 «Контакты»; слева: телефоны (крупно, `tel:`), email (`mailto:`), кнопки мессенджеров (Telegram — `Send`, MAX — `MessageCircle`, WhatsApp — только если заполнен), режим работы (`Clock`), адрес производства (`MapPin`), `responseTimePromise`; справа: LeadForm `callback` встроенная. Ниже на всю ширину: карта Яндекса (iframe `https://yandex.ru/map-widget/v1/?ll={lng},{lat}&z=15&pt={lng},{lat},pm2rdm`, высота 400 px, `loading="lazy"`, title «Карта проезда») и ссылка «Построить маршрут» (`https://yandex.ru/maps/?rtext=~{lat},{lng}`). Ниже — таблица реквизитов.
- **Loading:** скелетон двух колонок и прямоугольник карты.
- **Empty:** нет координат — карта скрыта, остаётся адрес текстом.
- **Error:** iframe карты не загрузился — под ним всегда видна текстовая ссылка «Открыть в Яндекс Картах».
- **Responsive:** < 1024 px — одна колонка, форма под контактами, карта 300 px.

### 4.14 Компонент: LeadForm и LeadDialog
**LeadDialog** — Dialog (десктоп, ширина 560 px) / Sheet снизу на всю высоту (мобильный < 768 px) с LeadForm внутри. Заголовок зависит от типа: `callback` — «Обратный звонок», `quote` — «Запрос коммерческого предложения», `calculation` — «Запрос расчёта».

**Поля по типам:**

| Поле | callback | quote | calculation | Компонент |
|---|---|---|---|---|
| Изделие | — | только чтение, если передано | — | Input disabled |
| Направление | — | — | Select (если не передано) | Select |
| Имя * | да | да | да | Input, `autocomplete="name"` |
| Телефон * | да | да | да | Input, `type="tel"`, маска `+7 (___) ___-__-__` |
| Email | — | да | да | Input `type="email"` |
| Организация | да | да | да | Input `autocomplete="organization"` |
| ИНН | — | да | да | Input `inputMode="numeric"`, 10 или 12 цифр |
| Регион поставки | — | да | да | Input |
| Количество | — | да, если передано изделие | — | Input `type="number"` min 1 |
| Сообщение | необязательно | обязательно, если нет изделия | обязательно, ≥ 20 символов | Textarea, счётчик символов |
| Согласие * | да | да | да | Checkbox, не отмечен по умолчанию |
| SmartCaptcha * | да | да | да | невидимая капча, вызывается по нажатию «Отправить» |
| website | скрытое | скрытое | скрытое | Input `tabIndex={-1}`, `aria-hidden`, вне экрана |

Текст рядом с чекбоксом: «Я даю согласие на обработку персональных данных» (ссылка на `/soglasie-na-obrabotku`) «в соответствии с политикой» (ссылка на `/politika-konfidencialnosti`). `consentVersion` берётся из `pages.soglasie-na-obrabotku.version`.

**Валидация:** на клиенте — та же `leadSchema` (без `captchaToken`) через `react-hook-form` + `@hookform/resolvers/zod`; ошибки показываются после ухода с поля и при отправке; сервер валидирует повторно.

**Состояния формы:**
- **Idle:** кнопка «Отправить» активна.
- **Submitting:** кнопка disabled, иконка `Loader2` с вращением, текст «Отправляем…», поля disabled.
- **Success:** форма заменяется блоком: `CheckCircle2` (цвет success), «Заявка №{number} принята», `responseTimePromise`, кнопка «Закрыть» (в диалоге) или «Отправить ещё одну» (встроенная). Если `number = null` — «Заявка принята». Цель Метрики `lead_{type}`.
- **Validation error:** сообщения под полями красным (`--color-danger`), рамка поля красная, фокус на первое ошибочное поле, `aria-invalid`.
- **Server/network error:** inline-блок `AlertCircle` над кнопкой с текстом из `error.message`; данные в полях сохраняются; кнопка снова активна.

**Сохранение черновика:** при вводе значения полей (кроме согласия и капчи) сохраняются в `sessionStorage['lead-draft-{type}']` с задержкой 500 мс; при открытии формы восстанавливаются; после успеха черновик удаляется.

**UTM:** при первом входе на сайт `utm_*` из URL сохраняются в `sessionStorage['utm']` и добавляются к каждой заявке.

### 4.15 Экран: Поиск
**Живой поиск:** CommandDialog (`⌘K`/`Ctrl+K` и иконка в шапке). Ввод с задержкой 300 мс → `GET /api/public/search`. Результаты сгруппированы: «Изделия», «Категории», «Направления», «Объекты»; у изделий миниатюра 48×36. Стрелки ↑↓ и Enter — переход. Enter без выбранного пункта → `/poisk?q=...`.
**Страница:** `/poisk?q=` — h1 «Результаты поиска: „{q}“», те же группы полным списком (до 20 в группе).
- **Loading:** в диалоге — 3 скелетон-строки; на странице — `loading.tsx` со скелетоном 6 строк.
- **Empty:** «Ничего не найдено по запросу „{q}“. Напишите нам — подберём аналог» + кнопка LeadDialog `quote` с `message` = «Ищу: {q}». Запрос короче 2 символов — «Введите минимум 2 символа», запрос не отправляется.
- **Error:** в диалоге — строка «Поиск временно недоступен» с `AlertCircle`; на странице — `error.tsx`.

### 4.16 Админка (`/admin`)
Интерфейс Payload «из коробки» с русской локализацией и следующими настройками:
- Группы в меню в порядке: «Заявки», «Каталог», «Контент», «Медиа», «Система».
- Dashboard: вверху блок `beforeDashboard` (серверный компонент) — «Новых заявок: {count}» со ссылкой на список с фильтром `status = new`, и «Заявок с неотправленным уведомлением: {count}» (если > 0).
- Логотип и иконка админки — из `site-settings.logo`, иначе название текстом.
- Видеоинструкция для клиента (10–15 минут): вход, добавление товара с фото и характеристиками, публикация, добавление объекта, документа, работа с заявками. Записывается после наполнения, ссылка в `beforeDashboard`.

---
## БЛОК 5: Business Logic

### 5.1 Правила валидации форм

**Форма заявки (сайт).** Источник — `leadSchema` (3.1). Одна схема на клиенте и на сервере.

| Поле | Тип | Правило | Текст ошибки |
|---|---|---|---|
| name | string | trim, 2–80 символов | «Введите имя» / «Не больше 80 символов» |
| phone | string | после удаления нецифр: 11 цифр, начало 7 или 8, либо 10 цифр, начало 9; хранится как `+7XXXXXXXXXX` | «Введите телефон в формате +7 900 000-00-00» |
| email | string | пусто или валидный email, до 120 символов | «Неверный email» |
| organization | string | до 150 символов | — |
| inn | string | пусто или 10/12 цифр с верной контрольной суммой | «Неверный ИНН» |
| region | string | до 100 символов | — |
| quantity | int | 1–100 000 | «Минимум 1» / «Не больше 100 000» |
| message | string | до 2000; для `quote` без изделия — обязательно; для `calculation` — минимум 20 | «Укажите изделие или опишите запрос» / «Опишите задачу — минимум 20 символов» |
| directionId | uuid | обязательно для `calculation` | «Выберите направление» |
| consent | boolean | строго `true` | «Нужно согласие на обработку персональных данных» |
| captchaToken | string | ≥ 10 символов, проверка на сервере | «Подтвердите, что вы не робот» |

**Формы админки.** Правила заданы в конфигурациях коллекций (блок 2). Сводно:

| Сущность | Поле | Правило |
|---|---|---|
| Товар | title | обязательно, ≤ 120 |
| Товар | sku | обязательно, уникально, `^[A-ZА-ЯЁ0-9][A-ZА-ЯЁ0-9.\-]{1,29}$` |
| Товар | gallery | 1–12 изображений |
| Товар | габариты | целые 1–20 000 мм |
| Товар | productionDaysMax | ≥ productionDaysMin |
| Товар | okpd2 | пусто или `^\d{2}\.\d{1,2}(\.\d{1,2})?(\.\d{3})?$` |
| Товар | category | принадлежит выбранному направлению |
| Товар | attributes | при публикации заполнены все с `required` |
| Объект | year | 2000 … текущий год + 1 |
| Объект | directions | минимум 1 |
| Изображение | alt | обязательно, ≤ 200 |
| Фото товара | ширина | ≥ 800 px (5.2, R-16) |
| Файл | размер | ≤ 20 МБ |
| Настройки | phones[].number | нормализуемый российский номер |
| Настройки | inn / ogrn / kpp | пусто или 10/12 с контрольной суммой / 13/15 цифр / 9 цифр |
| Категория | attributeSet[].key | `^[a-z][a-z0-9_]{1,39}$` |
| Партнёр | url | пусто или начинается с `https://` |

### 5.2 Бизнес-правила

| # | Правило | Реализация | При нарушении |
|---|---|---|---|
| R-01 | Цены на сайте не показываются нигде | В коллекциях нет полей цены | — |
| R-02 | Черновики товаров и объектов не видны на сайте, в поиске, в sitemap | `queries.ts` фильтрует `_status = published` | Прямой URL черновика → 404 |
| R-03 | Контакты, реквизиты, цифры, гарантия, обещание ответа хранятся только в `site-settings` | Компоненты читают `getSiteSettings()` | Найденное в коде дублирование — дефект |
| R-04 | Одинаковая заявка в течение 60 с не создаёт дубль | `dedupeKey` (3.1, шаг 8) | Возвращается номер существующей заявки |
| R-05 | Не более 5 заявок с одного IP за 10 минут, не более 60 поисков в минуту | `rateLimit` в памяти процесса (одна инстанция) | 429 с `Retry-After` |
| R-06 | Документы с истёкшим `validUntil` не показываются на сайте | `getDocuments` сравнивает с текущей датой по `Europe/Moscow` | Документ скрыт, в админке виден; еженедельное письмо (3.4a) |
| R-07 | Заказчик объекта показывается, только если `showCustomer = true` (по умолчанию false) | `getProjectBySlug` вырезает поле | — |
| R-08 | Категория товара принадлежит его направлению | Хук `syncAttributes` | Ошибка 400 в админке: «Категория не относится к выбранному направлению» |
| R-09 | Обязательные характеристики категории заполнены при публикации | Хук `syncAttributes` | «Заполните характеристику „…“», публикация не проходит, черновик сохраняется |
| R-10 | Нельзя удалить направление с категориями и категорию с товарами | `preventDeleteIfUsed` | «Нельзя удалить: …» |
| R-11 | slug уникален в коллекции | `unique: true` | «Значение должно быть уникальным» — редактор меняет название или slug |
| R-12 | Блок «Объекты» на главной выводится, только если опубликовано ≥ 3 объектов | `getFeaturedProjects` + проверка длины | Секция скрыта |
| R-13 | Заявка сохраняется в БД до любых уведомлений; сбой уведомлений не влияет на ответ посетителю | `after()` + статусы каналов | Статус канала `failed`, cron повторяет |
| R-14 | Если заявка пришла в нерабочее время (не пн–пт 9:00–18:00 МСК или праздник из `src/lib/holidays.ts`), к сообщению успеха добавляется «Сейчас нерабочее время — ответим {в понедельник / завтра} после 9:00» | `src/lib/working-hours.ts` | — |
| R-15 | WhatsApp не используется как канал уведомлений | Нет адаптера | — |
| R-16 | Фото товара — минимум 800 px по ширине | В `watermarkBeforeOperation` до наложения знака: `if (width < 800) throw new APIError('Фото слишком маленькое: нужно не меньше 800 px по ширине', 400)` | Загрузка отклоняется |
| R-17 | Пустой ОКПД2 товара берётся из категории | `syncAttributes` | — |
| R-18 | Удаление товара, указанного в заявках, разрешено; в заявке ссылка становится пустой, а название изделия сохраняется в `message` при создании заявки (строка «Изделие: {title}, арт. {sku}») | обработчик 3.1 | — |
| R-19 | Партнёры и группа компаний на сайте не показываются, пока `showPartners = false` | `home-page` | — |

`src/lib/holidays.ts` содержит массив нерабочих дат 2026–2027 годов по производственному календарю РФ (формат `YYYY-MM-DD`); обновляется раз в год вручную (пункт в README).

`src/lib/rate-limit.ts`:
```ts
const buckets = new Map<string, number[]>()

export function rateLimit(scope: string, key: string, limit: number, windowMs: number): { ok: boolean; retryAfterSec: number } {
  const now = Date.now()
  const id = `${scope}:${key}`
  const hits = (buckets.get(id) ?? []).filter((t) => now - t < windowMs)
  if (hits.length >= limit) {
    return { ok: false, retryAfterSec: Math.ceil((windowMs - (now - hits[0])) / 1000) }
  }
  hits.push(now)
  buckets.set(id, hits)
  if (buckets.size > 10_000) buckets.clear() // защита памяти от флуда уникальными IP
  return { ok: true, retryAfterSec: 0 }
}
```

### 5.3 Аутентификация (только админка)

Публичной регистрации и личного кабинета нет.

**Создание пользователя:**
1. При первом деплое `scripts/seed.ts` создаёт admin из `SEED_ADMIN_EMAIL` и `SEED_ADMIN_PASSWORD` (пароль из менеджера паролей, ≥ 16 символов). После первого входа пароль меняется в профиле.
2. Сотрудников клиента создаёт admin: «Пользователи» → «Создать» → email, имя, роль `editor`, временный пароль ≥ 12 символов. Временный пароль передаётся лично (не в мессенджере, где хранится история), сотрудник меняет его при первом входе.

**Вход:**
1. `/admin/login` → email и пароль.
2. Успех → cookie `payload-token` (HttpOnly, Secure, SameSite=Lax), срок 8 часов.
3. 5 неудачных попыток подряд → учётная запись блокируется на 15 минут; сообщение Payload о блокировке.

**Восстановление пароля:**
1. «Забыли пароль?» на странице входа → ввод email.
2. Payload отправляет письмо через SMTP со ссылкой `/admin/reset/{token}`; ссылка действует 1 час.
3. Новый пароль ≥ 12 символов. Проверка — хук коллекции `Users.hooks.beforeValidate`: если `data.password` задан и короче 12 символов → `throw new APIError('Пароль должен быть не короче 12 символов', 400)`. Хук срабатывает при создании пользователя, смене и сбросе пароля.
4. Если email не найден, Payload показывает тот же экран «письмо отправлено» (не раскрывает, есть ли пользователь).

**Выход:** кнопка «Выйти» в меню аккаунта; cookie удаляется.

### 5.4 Внешние интеграции

#### Email (Яндекс 360 для бизнеса, SMTP)
- **Тип:** SMTP `smtp.yandex.ru:465`, SSL, пароль приложения.
- **Отправляем:** письмо о заявке на каждый адрес из `notifyEmails`; письма восстановления пароля; еженедельное письмо о документах.
- **Письмо о заявке.** Тема: `Заявка №1042 — Запрос КП — ООО «СтройИнвест-М»` (организация, если указана, иначе имя). Тело — HTML-таблица: тип, дата и время (МСК, `14.10.2026 11:32`), имя, телефон ссылкой `tel:`, email, организация, ИНН, регион, изделие (название, артикул, ссылка на сайт), направление, количество, сообщение, страница отправки, UTM, ссылка «Открыть в админке». `Reply-To` = email клиента, если указан.
- **Получаем:** ответ SMTP (успех / ошибка).
- **Ретраи:** 3 попытки подряд с паузами 2 с и 8 с, таймаут соединения 10 с; дальше — cron каждые 10 минут до 5 попыток в сумме.
- **Fallback:** после 5 неудач `notifications.email = failed`; заявка видна в админке, счётчик на дашборде.

#### Telegram Bot API
- **Тип:** REST, `POST https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`.
- **Отправляем:** для каждого `chatId` из `telegramChatIds`:
```json
{
  "chat_id": "-1002233445566",
  "parse_mode": "HTML",
  "disable_web_page_preview": true,
  "text": "<b>Заявка №1042 · Запрос КП</b>\nООО «СтройИнвест-М», ИНН 7724553108\n👤 Ольга Сергеевна\n📞 +79165551234\n✉️ o.sergeevna@stroyinvest-m.ru\n📦 Скамейка без спинки (СК-014) × 40\n📍 Москва\n💬 Нужна поставка до 15 ноября, двор ЖК на Варшавском шоссе\n🔗 <a href=\"https://example-zavod.ru/admin/collections/leads/9d0e...\">Открыть в админке</a>"
}
```
Все пользовательские значения экранируются функцией `escapeHtml` (`&`, `<`, `>`, `"`). Текст обрезается до 4000 символов.
- **Получаем:** `{ "ok": true, "result": { "message_id": 812, ... } }` или `{ "ok": false, "error_code": 429, "parameters": { "retry_after": 12 } }`.
- **Ретраи:** 3 попытки (2 с, 8 с); при 429 — пауза `retry_after` секунд (если ≤ 30), иначе оставить cron. Таймаут запроса 10 с (`AbortSignal.timeout(10_000)`).
- **Fallback:** `failed` → cron. Если `TELEGRAM_BOT_TOKEN` пуст или нет chat_id — канал `skipped`.
- **Настройка:** бот создаётся через @BotFather, добавляется в группу менеджеров, `chat_id` группы получаем через `getUpdates` и вносим в `site-settings`. Инструкция — в `docs/SETUP.md`.

#### MAX Bot API
- **Тип:** REST, домен `botapi.max.ru`. `POST https://botapi.max.ru/messages?chat_id={chatId}`, заголовок `Authorization: ${MAX_BOT_TOKEN}`, тело `{ "text": "..." }` (обычный текст без HTML, тот же состав строк, что в Telegram, ссылка на админку последней строкой).
- **Получаем:** 200 с объектом сообщения; 401 — неверный токен; 429 — лимит.
- **Ретраи:** как Telegram.
- **Fallback:** `failed` → cron; пустой токен → `skipped`.
- **Изоляция:** весь код MAX — в `src/lib/notify/max.ts` с одной функцией `sendMax(chatId, text): Promise<void>`. Перед реализацией сверить способ передачи токена с https://dev.max.ru/docs-api (API молодой и меняется); при расхождении правится только этот файл.

#### Яндекс SmartCaptcha
- **Клиент:** скрипт `https://smartcaptcha.yandexcloud.net/captcha.js?render=onload`, невидимый режим (`invisible: true`), `sitekey` из `NEXT_PUBLIC_SMARTCAPTCHA_SITEKEY`, язык `ru`. Скрипт грузится только при открытии формы.
- **Сервер:** `POST https://smartcaptcha.yandexcloud.net/validate` с form-data `secret=${SMARTCAPTCHA_SERVER_KEY}`, `token`, `ip`. Ответ `{ "status": "ok" }` или `{ "status": "failed", "message": "..." }`.
- **Таймаут:** 3 с. **Fallback:** при таймауте или ошибке сети — пропустить проверку (3.1, шаг 6).

#### Яндекс Метрика
- Загружается после согласия на cookie (4.1). ID — `site-settings.metrikaId`. Параметры: `clickmap: true, trackLinks: true, accurateTrackBounce: true, webvisor: true`.
- **Цели** (`ym(id, 'reachGoal', name)`): `lead_callback`, `lead_quote`, `lead_calculation`, `click_phone`, `click_email`, `click_telegram`, `click_max`, `download_catalog`, `download_document`, `open_lead_dialog`, `search_used`.
- **Fallback:** если скрипт заблокирован — `window.ym` не определена, обёртка `track()` молча ничего не делает.

#### Яндекс Карты
- iframe-виджет без API-ключа (4.13). Fallback — текстовая ссылка.

### 5.5 Безопасность

- **CORS:** публичные эндпоинты не отдают заголовков `Access-Control-Allow-Origin` (только same-origin). `POST /api/public/leads` проверяет `Origin` (3.1, шаг 0). В Payload `cors` и `csrf` = только `NEXT_PUBLIC_SITE_URL`.
- **Заголовки** (в `next.config.ts` → `headers()` для всех путей, кроме `/admin/:path*`):
  - `Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline' https://mc.yandex.ru https://smartcaptcha.yandexcloud.net; img-src 'self' data: blob: https://mc.yandex.ru; style-src 'self' 'unsafe-inline'; font-src 'self'; frame-src https://yandex.ru https://smartcaptcha.yandexcloud.net; connect-src 'self' https://mc.yandex.ru wss://mc.yandex.ru https://smartcaptcha.yandexcloud.net; frame-ancestors 'none'; base-uri 'self'; form-action 'self'`
  - `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy: camera=(), microphone=(), geolocation=()`, `Strict-Transport-Security: max-age=31536000; includeSubDomains` (ставит Caddy).
- **Входные данные:** все публичные входы через Zod. React экранирует вывод; richText рендерится только через `RichText` Payload (без `dangerouslySetInnerHTML`). В сообщениях Telegram — `escapeHtml`. SQL-инъекции исключены: запросы только через Local API/Drizzle с параметрами; в `sql\`\`` не подставлять пользовательские строки.
- **Rate limiting:** 5.2, R-05. Вход в админку — лимит Payload (5 попыток / 15 минут).
- **Секреты:** только в `.env` на сервере (права 600, владелец root), в репозиторий попадает `.env.example`. Токены ботов не хранятся в БД.
- **Сеть:** наружу открыты только 80/443 (ufw). SSH — только по ключу, `PasswordAuthentication no`, порт 22 оставить, fail2ban для sshd. PostgreSQL и порт 3000 не публикуются наружу.
- **Загрузки:** только перечисленные MIME-типы (блок 2), ≤ 20 МБ. SVG не принимается ни в одну коллекцию (исключает XSS через SVG); логотип клиента загружается как PNG, пока не будет принято отдельное решение.
- **Персональные данные (152-ФЗ):** хранение только на VPS в РФ; отдельное согласие с версией (`consentVersion`) и временем (`consentAt`); политика обработки ПДн и текст согласия — страницы `pages`; заявки старше 3 лет удаляются cron-задачей (5.6); доступ к заявкам только у editor/admin; уведомление в Роскомнадзор подаёт клиент до запуска (пункт чек-листа 5.10).

### 5.6 Cron-задачи (crontab хоста, время МСК)

| Расписание | Задача | Как | Ошибка |
|---|---|---|---|
| `*/10 * * * *` | Повтор уведомлений | `POST /api/internal/retry-notifications` (3.4) | Лог в `/var/log/retry-notify.log`; при ответе ≠ 200 — `curl -f` вернёт ошибку, строка в логе |
| `0 3 * * *` | Бэкап БД и медиа | `scripts/backup.sh` (5.9) | Скрипт с `set -euo pipefail`; при ошибке отправляет сообщение в Telegram-чат через `curl` на Bot API с текстом «Бэкап не выполнен: {шаг}» |
| `0 9 * * 1` | Документы с истекающим сроком | `POST /api/internal/documents-expiry` (3.4a) | Лог |
| `30 3 1 * *` | Удаление заявок старше 3 лет | `POST /api/internal/purge-leads` (аналогично 3.4: удаляет `leads` с `createdAt < now − 3 года`, ответ `{ "data": { "deleted": 0 } }`) | Лог |
| `0 4 * * 0` | Очистка старых бэкапов | в `backup.sh`: удалить объекты старше 14 дней | Лог |

### 5.7 SEO

- **Метаданные** — `generateMetadata` на каждой странице через `src/lib/seo.ts`. Приоритет: поля `meta.title` / `meta.description` из SEO-плагина → шаблон:

| Страница | title | description |
|---|---|---|
| Главная | `{companyName} — производство МАФ, металлоконструкций и инженерных систем` | `heroSubtitle` |
| Направление | `{title} от производителя — {companyName}` | `shortDescription` |
| Категория | `{title} для благоустройства — купить от производителя` | `shortDescription` или «{title}: {N} моделей. Цена по запросу, собственное производство, доставка по России.» |
| Товар | `{title} {sku} — {category}` | `shortDescription` или «{title}, {габариты}, {материалы}. Срок изготовления {сроки}. Запросите КП.» |
| Объект | `{title}, {city}, {year} — объекты {companyName}` | `summary` |
| Контентная | `{title} — {companyName}` | `lead` |

  Description обрезается до 160 символов по границе слова. `alternates.canonical` — абсолютный URL без query-параметров (кроме `?page=N` при N > 1). Open Graph: `og:image` = обложка / первое фото товара (размер `card`), иначе `/og-default.png` (1200×630, генерируется из названия компании).
- **`app/sitemap.ts`:** главная, `/produkciya`, все направления, категории, опубликованные товары и объекты, `/obekty`, `/dokumenty`, все `pages`, `/kontakty`. `lastModified` = `updatedAt`. Не включать `/poisk`, `/admin`, `/api`.
- **`app/robots.ts`:** `allow: /`, `disallow: ['/admin', '/api/', '/poisk']`, `sitemap: {SITE}/sitemap.xml`, `host: {SITE}`.
- **JSON-LD:** `Organization` (в layout: name, legalName, url, logo, telephone, email, address, taxID = ИНН), `BreadcrumbList` (все страницы с крошками), `Product` (карточка), `ItemList` (категория).
- **Верификация:** `<meta name="yandex-verification" content="{site-settings.yandexVerification}">`, если заполнено.
- **Заголовки:** на странице ровно один `h1`.
- **Скорость:** LCP ≤ 2,5 с на мобильном 4G по Lighthouse, CLS ≤ 0,1. Все изображения WebP с `sizes`, шрифты `swap`, клиентский JS только в интерактивных компонентах (`'use client'` у LeadForm, CommandDialog, ProductGallery, CookieBanner, MobileNav, фильтра объектов не нужен — это ссылки).

### 5.8 Начальные значения `site-settings` (seed)

| Поле | Значение |
|---|---|
| companyName | из `SEED_COMPANY_NAME` (до получения — рабочее название, согласованное с клиентом) |
| phones | `[{ number: "+7 985 975-03-50", label: "Отдел продаж", primary: true }]` |
| emails | из `SEED_COMPANY_EMAIL` |
| workingHours | «пн–пт 9:00–18:00» |
| responseTimePromise | «Ответим в рабочее время в течение 1 часа» |
| facts | пусто (клиент присылает цифры; секция скрыта, пока пусто) |
| warrantyShort | пусто (заполняется после согласования условий гарантии с клиентом) |
| notifyEmails | из `SEED_NOTIFY_EMAIL` |
| реквизиты, адрес, координаты | пусто, заполняются из карточки предприятия |

Все тексты страниц (`pages`, `home-page`, описания направлений) пишет исполнитель по фактуре клиента и вносит через админку до запуска. Тексты не хранятся в коде.

### 5.9 Инфраструктура и деплой

**`.env.example`**
```bash
NODE_ENV=production
NEXT_PUBLIC_SITE_URL=https://example-zavod.ru
NEXT_PUBLIC_COMPANY_SHORT=Название
PAYLOAD_SECRET=                     # openssl rand -hex 32
DATABASE_URI=postgres://site:${POSTGRES_PASSWORD}@db:5432/site
POSTGRES_PASSWORD=                  # openssl rand -hex 24
SMTP_USER=noreply@example-zavod.ru
SMTP_PASS=                          # пароль приложения Яндекс 360
SMTP_FROM=noreply@example-zavod.ru
SMTP_FROM_NAME=Сайт компании
TELEGRAM_BOT_TOKEN=
MAX_BOT_TOKEN=
NEXT_PUBLIC_SMARTCAPTCHA_SITEKEY=
SMARTCAPTCHA_SERVER_KEY=
INTERNAL_CRON_SECRET=               # openssl rand -hex 32
WATERMARK_TEXT=Название
SEED_ADMIN_EMAIL=
SEED_ADMIN_PASSWORD=
SEED_COMPANY_NAME=
SEED_COMPANY_EMAIL=
SEED_NOTIFY_EMAIL=
S3_ENDPOINT=https://s3.ru1.storage.beget.cloud
S3_BUCKET=
S3_ACCESS_KEY=
S3_SECRET_KEY=
```

**`docker-compose.yml`**
```yaml
services:
  db:
    image: postgres:16-alpine
    restart: unless-stopped
    environment:
      POSTGRES_DB: site
      POSTGRES_USER: site
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U site -d site"]
      interval: 10s
      retries: 5

  app:
    build: .
    restart: unless-stopped
    env_file: .env
    depends_on:
      db:
        condition: service_healthy
    volumes:
      - media:/app/media
    ports:
      - "127.0.0.1:3000:3000"   # только для cron на хосте
    healthcheck:
      test: ["CMD", "wget", "-qO-", "http://127.0.0.1:3000/api/public/health"]
      interval: 30s
      retries: 3

  caddy:
    image: caddy:2-alpine
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile:ro
      - caddy_data:/data
    depends_on:
      - app

volumes:
  pgdata:
  media:
  caddy_data:
```

**`Caddyfile`**
```
example-zavod.ru, www.example-zavod.ru {
  @www host www.example-zavod.ru
  redir @www https://example-zavod.ru{uri} permanent

  @internal path /api/internal/*
  respond @internal 404

  encode zstd gzip
  header Strict-Transport-Security "max-age=31536000; includeSubDomains"
  request_body max_size 25MB

  reverse_proxy app:3000 {
    header_up X-Real-IP {remote_host}
  }
}
```
Домен `example-zavod.ru` заменяется на реальный в момент деплоя (единственное место, где он прописан, кроме `.env`).

**`Dockerfile`** — многоэтапная сборка на `node:22-alpine`: этап `deps` (`pnpm install --frozen-lockfile`), этап `build` (`pnpm build` с `output: 'standalone'` в `next.config.ts`), этап `runner` (копирует `.next/standalone`, `.next/static`, `public`, `src/migrations`; пользователь `node`; команда `sh -c "pnpm payload migrate && node server.js"`). Пакет `libc6-compat` для sharp.

**`scripts/backup.sh`** (на хосте установлены `docker`, `awscli` v2 и `curl`)
```bash
#!/usr/bin/env bash
set -euo pipefail
cd /opt/site
source .env
TS=$(date +%F_%H%M)
DIR=/opt/backups
mkdir -p "$DIR"
docker compose exec -T db pg_dump -U site -d site -Fc > "$DIR/db_$TS.dump"
docker run --rm -v site_media:/media -v "$DIR":/out alpine tar czf "/out/media_$TS.tar.gz" -C /media .
for f in "$DIR/db_$TS.dump" "$DIR/media_$TS.tar.gz"; do
  AWS_ACCESS_KEY_ID=$S3_ACCESS_KEY AWS_SECRET_ACCESS_KEY=$S3_SECRET_KEY \
    aws --endpoint-url "$S3_ENDPOINT" s3 cp "$f" "s3://$S3_BUCKET/$(basename "$f")"
done
find "$DIR" -type f -mtime +3 -delete   # локально храним 3 дня, в S3 — 14 (lifecycle-правило бакета)
```
При ошибке любой команды срабатывает `trap` (добавить в начало: `trap 'curl -s "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/sendMessage" -d chat_id=$BACKUP_ALERT_CHAT_ID -d text="Бэкап не выполнен: строка $LINENO"' ERR`, переменная `BACKUP_ALERT_CHAT_ID` — в `.env`).

**Проверка восстановления** (обязательно один раз до запуска): развернуть дамп в отдельную БД командой `pg_restore -d site_restore_test db_<TS>.dump` и открыть сайт на тестовом порту.

**Деплой новой версии:** `git pull && docker compose build app && docker compose up -d app`. Миграции применяются при старте контейнера.

**Окружения:** `dev` (локально, `docker compose` только с `db`, `pnpm dev`), `production` (VPS). Тестовый поддомен `dev.{домен}` на том же VPS с отдельной БД — для показа клиенту до запуска, закрыт `basicauth` в Caddy и `X-Robots-Tag: noindex`.

### 5.10 Предзапускной чек-лист

- [ ] Реквизиты, адрес производства и координаты заполнены в `site-settings`.
- [ ] Логотип загружен, `watermark.png` пересобран с логотипом.
- [ ] Тексты всех `pages` и `home-page` согласованы с клиентом.
- [ ] Политика ПДн и согласие опубликованы, у согласия заполнена `version`.
- [ ] Клиент подал уведомление об обработке ПДн в Роскомнадзор.
- [ ] Минимум 20 товаров и 6 объектов опубликованы.
- [ ] Тестовая заявка каждого типа дошла на email, в Telegram и MAX.
- [ ] Бэкап создан и один раз восстановлен.
- [ ] Метрика: все цели срабатывают (проверка в режиме отладки `?_ym_debug=1`).
- [ ] Сайт добавлен в Яндекс Вебмастер, sitemap отправлен; компания добавлена в Яндекс Бизнес по адресу производства.
- [ ] Lighthouse мобильный: Performance ≥ 85, Accessibility ≥ 95, SEO = 100 на главной, категории и карточке.
- [ ] Тестовый поддомен закрыт от индексации, на боевом `robots.txt` разрешает индексацию.
- [ ] Клиент получил доступы (регистратор, хостинг, Яндекс 360, Метрика, админка) и видеоинструкцию.

---
## БЛОК 6: Edge Cases

### Сеть и доступность
| # | Ситуация | Триггер | Поведение системы |
|---|---|---|---|
| 1 | Пропал интернет при отправке формы | `fetch` выбрасывает `TypeError` | Inline-ошибка «Не удалось отправить. Проверьте интернет и попробуйте ещё раз», данные остаются в полях и в `sessionStorage`, кнопка снова активна. Автоповтора нет, чтобы не создать дубль без ведома пользователя |
| 2 | Медленный мобильный интернет | Ответ `/api/public/leads` дольше 15 с | Клиент прерывает запрос через `AbortSignal.timeout(15_000)`, показывает «Сервер отвечает слишком долго. Попробуйте ещё раз или позвоните: {телефон}». Повторная отправка той же заявки не создаст дубль (R-04) |
| 3 | Сервис SmartCaptcha недоступен | Скрипт не загрузился у посетителя за 5 с или `/validate` не ответил серверу за 3 с | На клиенте: форма отправляется с `captchaToken = "unavailable-" + Date.now()`. На сервере (3.1, шаг 6): такой токен не отправляется на проверку, а проходит отдельный лимит `rateLimit('captcha-bypass', ip, 2, 3_600_000)`; превышение → 400 `CAPTCHA_FAILED`. Таймаут `/validate` для обычного токена → пропуск проверки. В лог пишется `captcha_unavailable` с IP |
| 4 | SMTP Яндекса недоступен | Ошибка соединения или 5xx | Заявка сохранена, `notifications.email = failed`, Telegram и MAX отправляются независимо, cron повторяет до 5 попыток |
| 5 | Telegram API недоступен или замедлен в РФ | Таймаут 10 с / 429 | Как п. 4 для канала `telegram`; email остаётся основным каналом |
| 6 | Упала база данных | `SELECT 1` в health не проходит | `/api/public/health` → 503; страницы отдаются из кэша ISR (последняя успешная версия); `POST /api/public/leads` → 500 с телефоном в тексте; мониторинг шлёт алерт; Docker перезапускает `db` по `restart: unless-stopped` |
| 7 | Не загрузилась карта Яндекса | Блокировщик или сбой сети | Под iframe всегда есть текстовый адрес и ссылка «Открыть в Яндекс Картах» |

### Данные и состояние
| # | Ситуация | Триггер | Поведение системы |
|---|---|---|---|
| 8 | Двойной клик по «Отправить» | Два запроса за < 1 с | Кнопка блокируется после первого клика; если второй запрос всё же дошёл — `dedupeKey` возвращает номер первой заявки |
| 9 | Два редактора правят один товар | Сохранение поверх чужих изменений | Payload сохраняет последнюю версию; предыдущая остаётся в истории версий (`maxPerDoc: 20`), её можно восстановить во вкладке «Версии» |
| 10 | Товар снят с публикации, а у посетителя открыта его карточка | Отправка формы с `productId` черновика | 404 `PRODUCT_NOT_FOUND` с текстом «Изделие не найдено. Возможно, оно снято с публикации»; в форме появляется ссылка «Отправить заявку без изделия», которая переключает тип на `callback` с сохранением введённых данных |
| 11 | Изменён slug товара или категории | Редактор переименовал | Старый URL → 404. Предупреждение в описании поля slug (2.2). Если товар найден по slug, но категория/направление в URL другие → `permanentRedirect` на правильный путь (4.7) |
| 12 | Удаление категории с товарами | Кнопка «Удалить» в админке | Блокируется хуком: «Нельзя удалить: товаров в категории 12. Сначала перенесите или удалите их» |
| 13 | Смена категории товара на категорию с другим набором характеристик | Редактор меняет категорию | `syncAttributes` пересобирает строки: совпадающие по `key` значения сохраняются, остальные удаляются, новые появляются пустыми; при публикации — проверка обязательных |
| 14 | Фото товара удалено из «Фото товаров», но товар ссылается на него | Удаление медиа | Payload обнуляет ссылку; если галерея стала пустой — на сайте плейсхолдер `ImageOff`, в админке при следующем сохранении — ошибка `minRows: 1` «Добавьте хотя бы одно фото» |
| 15 | Ни одного опубликованного объекта / документа / товара в категории | Начальное наполнение | Секции скрываются или показывают Empty-состояния из блока 4 — нигде нет пустых сеток и заголовков без содержимого |
| 16 | Номер телефона введён с пробелами, скобками, через 8 | `8 (916) 555-12-34` | Нормализуется в `+79165551234`, в уведомлениях — в этом формате, ссылка `tel:` работает |

### Безопасность
| # | Ситуация | Триггер | Поведение системы |
|---|---|---|---|
| 17 | Бот заполняет формы | Заполнено скрытое поле `website` | 201 с `number: null`, в БД ничего не пишется, уведомлений нет |
| 18 | Флуд заявками с одного IP | > 5 запросов за 10 минут | 429 с `Retry-After`; в лог пишется IP |
| 19 | XSS через поле заявки | `<script>alert(1)</script>` в `message` | Сохраняется как текст; в админке выводится как текст; в Telegram экранируется; в email — экранируется в HTML-шаблоне |
| 20 | Подбор пароля к админке | 5 неудачных входов | Блокировка учётной записи на 15 минут |
| 21 | Прямой доступ к заявкам через REST | `GET /api/leads` без cookie | 403 (access `read: isEditorOrAdmin`) |
| 22 | Попытка получить chat_id уведомлений | `GET /api/globals/site-settings` гостем | Поля `notifyEmails`, `telegramChatIds`, `maxChatIds` отсутствуют в ответе (field access) |
| 23 | Вызов внутреннего эндпоинта снаружи | `POST https://домен/api/internal/...` | Caddy отвечает 404, запрос не доходит до приложения |
| 24 | Запрос с чужого сайта на приём заявок | `Origin: https://evil.example` | 403 `FORBIDDEN_ORIGIN` |
| 25 | Загрузка исполняемого файла под видом PDF | `.exe` с MIME `application/pdf` | Payload проверяет MIME по содержимому файла (file-type); несовпадение — отказ загрузки |

### Лимиты и производительность
| # | Ситуация | Триггер | Поведение системы |
|---|---|---|---|
| 26 | Фото 12 МБ с телефона, 6000×4000 px | Загрузка в «Фото товаров» | Принимается (≤ 20 МБ), главный файл ужимается до 2560 px по ширине в WebP, плюс размеры 480/960/1920 |
| 27 | Фото шириной 600 px | Загрузка в «Фото товаров» | Отклоняется: «Фото слишком маленькое: нужно не меньше 800 px по ширине» |
| 28 | Файл больше 20 МБ | Загрузка PDF 35 МБ | Отказ Payload «Файл слишком большой»; Caddy режет тело запроса > 25 МБ |
| 29 | Сообщение в заявке 10 000 символов | Вставка лога или ТЗ | Клиентская валидация: счётчик «2000 / 2000», ввод обрезается; сервер — 400 при > 2000 |
| 30 | Категория с 300 товарами | Рост каталога | Пагинация по 24, запрос с `limit` и индексом по `category`; время ответа страницы из ISR — мгновенно |
| 31 | 1000 и больше заявок в админке | Время | Список с пагинацией Payload (по 25), индексы по `status` и `createdAt`, поиск по имени/телефону/организации |
| 32 | Одновременная публикация 20 товаров | Массовое наполнение | Каждая публикация вызывает `revalidatePath('/produkciya', 'layout')`; повторные вызовы безопасны, пересборка страниц ленивая (при следующем запросе) |
| 33 | Диск VPS заполнен | Медиа + бэкапы | Локальные бэкапы хранятся 3 дня; мониторинг диска: cron-скрипт раз в сутки шлёт алерт в Telegram при заполнении > 80% (`df --output=pcent /`) |

### Уведомления (вместо платежей — платежей в проекте нет)
| # | Ситуация | Триггер | Поведение системы |
|---|---|---|---|
| 34 | Все каналы уведомлений упали | Заявка + сбой SMTP, Telegram и MAX | Заявка в БД, счётчик «Заявок с неотправленным уведомлением» на дашборде админки, cron повторяет 5 раз в течение 24 часов |
| 35 | Бот удалён из группы Telegram | 403 от Bot API «bot was kicked» | Канал `failed`, в `lastError` — текст ошибки; повторы не помогут — в лог пишется подсказка «Проверьте, что бот состоит в группе» |
| 36 | Токен MAX не выдан (бот не создан) | `MAX_BOT_TOKEN` пуст | Канал `skipped`, остальные работают |

### Время
| # | Ситуация | Триггер | Поведение системы |
|---|---|---|---|
| 37 | Сервер в UTC, заказчик в Москве | Любая дата в уведомлениях | В БД — UTC (ISO); в письмах, Telegram и на сайте — `Europe/Moscow` через `Intl.DateTimeFormat('ru-RU', { timeZone: 'Europe/Moscow' })` |
| 38 | Заявка в пятницу в 18:30 | Нерабочее время | Сообщение успеха: «Сейчас нерабочее время — ответим в понедельник после 9:00» (R-14) |
| 39 | Заявка в праздник (например, 1 января) | Дата из `holidays.ts` | Как п. 38, с ближайшим рабочим днём |
| 40 | Документ действует до сегодняшней даты | `validUntil = сегодня` | Документ показывается весь этот день (сравнение «до конца дня по Москве»), скрывается со следующего |
| 41 | Смена года | 1 января | `© {текущий год}` в подвале вычисляется при рендере; валидатор года объекта использует текущий год; `holidays.ts` нужно продлить (напоминание в README и в еженедельном письме о документах в декабре) |

---
## Приложение А. Порядок реализации для Claude Code

Выполнять по этапам. После каждого этапа — `pnpm lint`, `pnpm tsc --noEmit`, `pnpm build` без ошибок, коммит.

| Этап | Что сделать | Готово, когда |
|---|---|---|
| 1. Каркас | `pnpm create payload-app` (шаблон `blank`, PostgreSQL), Tailwind v4, shadcn/ui, шрифты, `docker-compose` для локальной БД, структура папок 0.5, `.env.example` | `/admin` открывается на русском, локальная БД работает |
| 2. Модель данных | Все коллекции и глобалы блока 2, хуки, валидаторы, миграции (автоматическая + 2.13), `generate:types`, `scripts/seed.ts`, `scripts/make-watermark.ts` | Seed отрабатывает дважды без ошибок; товар с характеристиками создаётся по US-004; фото получает водяной знак |
| 3. Запросы и layout | `queries.ts`, Header, Footer, MobileNav, Breadcrumbs, CookieBanner, `error.tsx`, `not-found.tsx`, `loading.tsx` | Навигация работает на трёх брейкпоинтах |
| 4. Каталог | Страницы 4.3–4.7 | Путь «направление → категория → товар» с Empty и Loading-состояниями |
| 5. Контент | Страницы 4.2, 4.8–4.13 | Все маршруты из 0.4 отдают 200 или корректные 404 |
| 6. Заявки | `leadSchema`, LeadForm, LeadDialog, `/api/public/leads`, SmartCaptcha, rate limit, `notify/*`, `/api/internal/*`, дашборд админки | Заявка каждого типа сохраняется и уходит во все настроенные каналы; все ошибки 3.1 воспроизводятся |
| 7. Поиск | `/api/public/search`, CommandDialog, `/poisk` | US-007 проходит |
| 8. SEO и аналитика | 5.7, цели Метрики, sitemap, robots, JSON-LD | Проверка через валидатор микроразметки Яндекса без ошибок |
| 9. Безопасность и деплой | Заголовки 5.5, Dockerfile, Caddyfile, backup.sh, crontab, ufw, fail2ban | Сайт на `dev.{домен}` за basicauth, бэкап создан и восстановлен |
| 10. Проверка | Прогон всех критериев приёмки блока 1 и edge cases блока 6 (ручные проверки — чек-листом в `docs/QA.md`) | Все пункты отмечены |

## Приложение Б. Что сознательно не входит в эту версию

Корзина запроса КП на несколько позиций, скачивание чертежей и 3D-моделей, страница «Цвета и покрытия», фильтры по характеристикам, загрузка файлов в формы, блог, английская версия, личный кабинет, онлайн-оплата, интеграция с CRM, редиректы при смене slug. Модель данных не мешает добавить любую из этих функций позже без переделки существующих коллекций.
