// Начальные данные. Идемпотентен: существующие документы пропускаются.
// Запуск: pnpm seed
import { getPayload } from 'payload'
import config from '../src/payload.config'
import { PAGE_SLUGS } from '../src/collections/Pages'

const payload = await getPayload({ config })
const ctx = { disableRevalidate: true }

const log = (msg: string) => console.log(`[seed] ${msg}`)

async function ensure(collection: 'directions' | 'categories' | 'pages', where: Record<string, unknown>, data: Record<string, unknown>) {
  const found = await payload.find({ collection, where, limit: 1, depth: 0, overrideAccess: true })
  if (found.docs[0]) return found.docs[0]
  log(`create ${collection}: ${JSON.stringify(where)}`)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return payload.create({ collection, data: data as any, overrideAccess: true, context: ctx })
}

// --- администратор ---
const adminEmail = process.env.SEED_ADMIN_EMAIL
const adminPassword = process.env.SEED_ADMIN_PASSWORD
if (adminEmail && adminPassword) {
  const u = await payload.find({ collection: 'users', where: { email: { equals: adminEmail } }, limit: 1, overrideAccess: true })
  if (!u.docs[0]) {
    log(`create admin ${adminEmail}`)
    await payload.create({
      collection: 'users',
      data: { email: adminEmail, password: adminPassword, name: 'Администратор', role: 'admin' },
      overrideAccess: true,
      context: ctx,
    })
  }
}

// --- направления ---
const DIRECTIONS = [
  {
    order: 10, title: 'Малые архитектурные формы', slug: 'maf', type: 'catalog',
    shortDescription: 'Скамейки, урны и другие изделия для благоустройства дворов, парков и учреждений.',
    okpd2: '31.01.12',
  },
  {
    order: 20, title: 'Уличная мебель', slug: 'ulichnaya-mebel', type: 'catalog',
    shortDescription: 'Уличная и складская металлическая мебель, системы хранения, уличные тренажёры.',
  },
  {
    order: 30, title: 'Противопожарные двери', slug: 'protivopozharnye-dveri', type: 'catalog',
    shortDescription: 'Противопожарные двери собственного производства для зданий и сооружений.',
  },
  {
    order: 40, title: 'Фасадные системы', slug: 'fasadnye-sistemy', type: 'service',
    shortDescription: 'Вентилируемые навесные фасады, металлокассеты, корзины для кондиционеров, козырьки и навесы.',
  },
  {
    order: 50, title: 'Тепловые узлы', slug: 'teplovye-uzly', type: 'service',
    shortDescription: 'Модульные тепловые узлы: проектирование, изготовление и поставка.',
  },
  {
    order: 60, title: 'Шумозащитные кожухи', slug: 'shumozashchitnye-kozhuhi', type: 'service',
    shortDescription: 'Шумозащитные кожухи для оборудования любых габаритов.',
  },
  {
    order: 70, title: 'Проектирование котельных', slug: 'proektirovanie-kotelnyh', type: 'service',
    shortDescription: 'Проектирование котельных узлов и производство теплового оборудования.',
  },
] as const

const dir: Record<string, string> = {}
for (const d of DIRECTIONS) {
  const doc = await ensure('directions', { slug: { equals: d.slug } }, d)
  dir[d.slug] = doc.id as string
}

// --- категории и наборы характеристик ---
type Attr = { key: string; label: string; unit?: string; required?: boolean }
const CATEGORIES: Array<{ title: string; slug: string; direction: string; order: number; okpd2?: string; attributeSet: Attr[] }> = [
  {
    title: 'Скамейки', slug: 'skamejki', direction: 'maf', order: 10, okpd2: '31.01.12',
    attributeSet: [
      { key: 'seats_count', label: 'Посадочных мест', unit: 'шт', required: true },
      { key: 'has_backrest', label: 'Спинка', required: true },
      { key: 'wood_species', label: 'Порода дерева' },
      { key: 'mounting', label: 'Способ установки', required: true },
    ],
  },
  {
    title: 'Урны', slug: 'urny', direction: 'maf', order: 20, okpd2: '25.99',
    attributeSet: [
      { key: 'volume', label: 'Объём', unit: 'л', required: true },
      { key: 'has_liner', label: 'Вкладыш' },
    ],
  },
  {
    title: 'Навесы и перголы', slug: 'navesy-i-pergoly', direction: 'maf', order: 30,
    attributeSet: [
      { key: 'area', label: 'Площадь', unit: 'м²', required: true },
      { key: 'roof_material', label: 'Материал кровли' },
    ],
  },
  { title: 'Столы', slug: 'stoly', direction: 'ulichnaya-mebel', order: 10, attributeSet: [] },
  {
    title: 'Двери EI 60', slug: 'dveri-ei-60', direction: 'protivopozharnye-dveri', order: 10,
    attributeSet: [
      { key: 'fire_rating', label: 'Предел огнестойкости', required: true },
      { key: 'leaves', label: 'Количество створок', unit: 'шт', required: true },
      { key: 'certificate', label: 'Сертификат ТР ЕАЭС 043/2017' },
      { key: 'hardware', label: 'Комплектация' },
    ],
  },
]
for (const c of CATEGORIES) {
  await ensure('categories', { slug: { equals: c.slug } }, { ...c, direction: dir[c.direction] })
}

// --- страницы (тексты вносятся через админку) ---
for (const p of PAGE_SLUGS) {
  await ensure('pages', { slug: { equals: p.value } }, { title: p.label, slug: p.value })
}

// --- настройки сайта ---
const settings = await payload.findGlobal({ slug: 'site-settings', depth: 0, overrideAccess: true })
if (!settings.companyName) {
  log('site-settings')
  const companyEmail = process.env.SEED_COMPANY_EMAIL
  const notifyEmail = process.env.SEED_NOTIFY_EMAIL
  await payload.updateGlobal({
    slug: 'site-settings',
    overrideAccess: true,
    context: ctx,
    data: {
      companyName: process.env.SEED_COMPANY_NAME || 'ПК Стрела',
      phones: [{ number: '+7 985 975-03-50', label: 'Отдел продаж', primary: true }],
      emails: companyEmail ? [{ email: companyEmail }] : [],
      workingHours: 'пн–пт 9:00–18:00',
      responseTimePromise: 'Ответим в рабочее время в течение 1 часа',
      notifyEmails: notifyEmail ? [{ email: notifyEmail }] : [],
    },
  })
}

// --- главная ---
const home = await payload.findGlobal({ slug: 'home-page', depth: 0, overrideAccess: true })
if (!home.heroTitle) {
  log('home-page')
  await payload.updateGlobal({
    slug: 'home-page',
    overrideAccess: true,
    context: ctx,
    data: {
      heroTitle: 'Металлоконструкции, МАФ и инженерные системы от производителя',
      heroSubtitle:
        'Собственное производство: лазерная резка, гибка, сварка и порошковая окраска. Фасады, противопожарные двери, малые архитектурные формы, тепловые узлы.',
      audiences: [
        { title: 'Госзаказчикам', text: 'Документы, реквизиты, ОКПД2 и реализованные объекты для закупок по 44-ФЗ и 223-ФЗ.', href: '/goszakazchikam' },
        { title: 'Подрядчикам', text: 'Изготовление и поставка по вашим чертежам и спецификациям, сроки и условия по запросу.', href: '/kontakty' },
        { title: 'Проектировщикам', text: 'Характеристики изделий и материалов для включения в проекты.', href: '/produkciya' },
      ],
      productionText:
        'Собственный производственный комплекс: оборудование для лазерной резки листового металла, гидравлические листогибочные прессы, сварочные установки, камеры порошковой полимерной окраски, упаковочные и такелажные средства.',
      steps: [
        { title: 'Заявка', text: 'Вы описываете задачу или выбираете изделие в каталоге.' },
        { title: 'Расчёт', text: 'Готовим коммерческое предложение с ценой и сроками.' },
        { title: 'Производство', text: 'Изготавливаем на собственной площадке.' },
        { title: 'Поставка', text: 'Доставляем и при необходимости монтируем.' },
      ],
    },
  })
}

log('done')
process.exit(0)
