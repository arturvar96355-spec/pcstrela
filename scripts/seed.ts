// Начальные данные. Идемпотентен: существующие документы пропускаются.
// Запуск: pnpm seed
import { getPayload, type Where } from 'payload'
import fs from 'node:fs'
import path from 'node:path'
import config from '../src/payload.config'
import { PAGE_SLUGS } from '../src/collections/Pages'
import { slugify } from '../src/hooks/slug'

const payload = await getPayload({ config })
const ctx = { disableRevalidate: true }

const log = (msg: string) => console.log(`[seed] ${msg}`)

async function ensure(collection: 'directions' | 'categories' | 'pages', where: Where, data: Record<string, unknown>) {
  const found = await payload.find({ collection, where, limit: 1, depth: 0, overrideAccess: true })
  if (found.docs[0]) return found.docs[0]
  log(`create ${collection}: ${JSON.stringify(where)}`)
   
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

// --- изображения из презентации заказчика ---
const ASSETS = path.join(process.cwd(), 'scripts', 'seed-assets')
const IMAGES: Record<string, string> = {
  'maf-bench': 'Скамейка с деревянным сиденьем на стальном каркасе',
  pergola: 'Навес с металлическим каркасом на площадке',
  urn: 'Урна для раздельного сбора мусора',
  facade: 'Здание с навесным вентилируемым фасадом',
  'heat-unit-1': 'Модульный тепловой узел',
  'heat-unit-2': 'Модульный тепловой узел на раме',
  'noise-casing': 'Шумозащитный кожух для оборудования',
  storage: 'Металлическая система хранения',
  fence: 'Декоративное металлическое ограждение',
  laser: 'Станок лазерной резки листового металла',
  press: 'Гидравлический листогибочный пресс',
  paint: 'Камера порошковой полимерной окраски',
}
const media: Record<string, string> = {}
for (const [name, alt] of Object.entries(IMAGES)) {
  const found = await payload.find({ collection: 'media', where: { alt: { equals: alt } }, limit: 1, depth: 0, overrideAccess: true })
  if (found.docs[0]) {
    media[name] = found.docs[0].id as string
    continue
  }
  const file = path.join(ASSETS, `${name}.jpg`)
  if (!fs.existsSync(file)) continue
  log(`upload media ${name}`)
  const buf = fs.readFileSync(file)
  const doc = await payload.create({
    collection: 'media',
    data: { alt },
    file: { data: buf, mimetype: 'image/jpeg', name: `${name}.jpg`, size: buf.length },
    overrideAccess: true,
    context: ctx,
  })
  media[name] = doc.id as string
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

const COVERS: Record<string, string> = {
  maf: 'maf-bench',
  'ulichnaya-mebel': 'pergola',
  'fasadnye-sistemy': 'facade',
  'teplovye-uzly': 'heat-unit-1',
  'shumozashchitnye-kozhuhi': 'noise-casing',
  'proektirovanie-kotelnyh': 'heat-unit-2',
}
const dir: Record<string, string> = {}
for (const d of DIRECTIONS) {
  const doc = await ensure('directions', { slug: { equals: d.slug } }, d)
  dir[d.slug] = doc.id as string
  const cover = media[COVERS[d.slug]]
  if (cover && !doc.cover) {
    await payload.update({ collection: 'directions', id: doc.id, data: { cover }, overrideAccess: true, context: ctx })
  }
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
      heroImage: media.facade,
      productionImages: [media.laser, media.press, media.paint].filter(Boolean),
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

// фото главной (для уже созданной главной)
if (home.heroTitle && !home.heroImage && media.facade) {
  await payload.updateGlobal({
    slug: 'home-page',
    overrideAccess: true,
    context: ctx,
    data: { heroImage: media.facade, productionImages: [media.laser, media.press, media.paint].filter(Boolean) },
  })
}

// фото на странице «Производство»
const prod = await payload.find({ collection: 'pages', where: { slug: { equals: 'proizvodstvo' } }, limit: 1, depth: 0, overrideAccess: true })
if (prod.docs[0] && !(prod.docs[0].gallery ?? []).length) {
  await payload.update({
    collection: 'pages',
    id: prod.docs[0].id,
    data: { gallery: [media.laser, media.press, media.paint].filter(Boolean) },
    overrideAccess: true,
    context: ctx,
  })
}


// --- объекты из презентации заказчика: только черновики, заказчик скрыт ---
// Годов в презентации нет, поэтому поле «Год» пустое. Публикует объекты админ после согласования с заказчиком.
type P = { title: string; city: string; customer?: string; summary: string; directions?: string[] }
const PROJECTS: P[] = [
  { title: 'Поликлиника ГБУЗ ВО «Кольчугинская центральная районная больница»', city: 'Кольчугино', customer: 'ГБУ «Служба единого заказчика Владимирской области»', summary: 'Инженерные изыскания, проектная документация, государственная экспертиза, рабочая документация, строительство объекта, поставка оборудования и ввод в эксплуатацию.' },
  { title: 'Авторский надзор: поликлиника Кольчугинской центральной районной больницы', city: 'Кольчугино', customer: 'ГБУ «Служба единого заказчика Владимирской области»', summary: 'Услуги по осуществлению авторского надзора за выполнением строительно-монтажных работ на объекте.' },
  { title: 'Блочно-модульная котельная в микрорайоне № 1', city: 'Кольчугино', customer: 'МКУ «Управление строительства, архитектуры и жилищно-коммунального хозяйства Кольчугинского района»', summary: 'Комплекс работ по проектированию и строительству блочно-модульной котельной.', directions: ['proektirovanie-kotelnyh'] },
  { title: 'Котельная 8-й микрорайон', city: 'Александров', customer: 'МКУ «Управление жилищно-коммунального хозяйства Александровского района»', summary: 'Выполнение работ по капитальному строительству котельной.', directions: ['proektirovanie-kotelnyh'] },
  { title: 'Котельная по ул. Революции', city: 'Александров', customer: 'МКУ «Управление жилищно-коммунального хозяйства Александровского района»', summary: 'Выполнение работ по капитальному строительству котельной.', directions: ['proektirovanie-kotelnyh'] },
  { title: 'Капитальный ремонт детской поликлиники Апатитско-Кировской ЦГБ', city: 'Апатиты', customer: 'ГОКУ «Управление капитального строительства Мурманской области»', summary: 'Капитальный ремонт детской поликлиники по адресу: г. Апатиты, ул. Ленина, д. 32.' },
  { title: 'Капитальный ремонт лечебного корпуса Апатитско-Кировской ЦГБ', city: 'Кировск', summary: 'Капитальный ремонт здания лечебного корпуса по адресу: г. Кировск, пр. Ленина, 26Б.' },
  { title: 'Детский сад на 75 мест в н.п. Килпъявр', city: 'Килпъявр', customer: 'МБОУ Кольского округа «Междуреченская средняя общеобразовательная школа»', summary: 'Подготовка проектной документации и строительство детского сада на 75 мест.' },
  { title: 'Капитальный ремонт школы в р.п. Большие Дворы (МОУ СОШ № 11)', city: 'Павловский Посад', customer: 'Администрация Павлово-Посадского городского округа', summary: 'Инженерные изыскания, проектная документация и капитальный ремонт школы по адресу: ул. Спортивная, д. 12.' },
  { title: 'Капитальный ремонт школы-интерната для обучающихся с ОВЗ', city: 'Павловский Посад', customer: 'Администрация Павлово-Посадского городского округа', summary: 'Инженерные изыскания, проектная документация и капитальный ремонт школы-интерната по адресу: ул. Тимирязева, вл. 15.' },
  { title: 'Капитальный ремонт Лотошинской детской школы искусств', city: 'Лотошино', customer: 'ГКУ Московской области «Дирекция заказчика капитального строительства»', summary: 'Инженерные изыскания, проектная документация, капитальный ремонт с поставкой оборудования. Адрес: ул. Центральная, д. 16.' },
  { title: 'Капитальный ремонт Ложковской школы', city: 'Солнечногорск', customer: 'ГКУ Московской области «Дирекция заказчика капитального строительства»', summary: 'Инженерные изыскания, проектная документация, капитальный ремонт и поставка оборудования. Адрес: п. Майдарово.' },
  { title: 'Общеобразовательная школа на 825 мест в пос. Доброград', city: 'Доброград', customer: 'МБУ Ковровского района «Служба единого заказчика»', summary: 'Строительство общеобразовательной школы на 825 мест.' },
  { title: 'Школа на 1100 мест в мкр. Сновицы-Веризино', city: 'Владимир', customer: 'Управление архитектуры и строительства администрации города Владимира', summary: 'Выполнение строительно-монтажных работ на объекте.' },
  { title: 'Детский сад на 250 мест по ул. Вокзальной', city: 'Подольск', customer: 'МКУ «Градостроительное управление»', summary: 'Разработка рабочей документации, строительно-монтажные работы и поставка оборудования. Адрес: ул. Вокзальная, д. 5а.' },
  { title: 'Капитальный ремонт Фильмохранилища № 11', city: 'Домодедово', customer: 'ФГБУК «Государственный фонд кинофильмов Российской Федерации»', summary: 'Капитальный ремонт Фильмохранилища № 11. Адрес: мкр-н Белые Столбы, пр-т Госфильмофонда.' },
  { title: 'Капитальный ремонт Фильмохранилища № 5', city: 'Домодедово', customer: 'ФГБУК «Государственный фонд кинофильмов Российской Федерации»', summary: 'Капитальный ремонт Фильмохранилища № 5. Адрес: мкр-н Белые Столбы, пр-т Госфильмофонда.' },
  { title: 'Детское поликлиническое отделение Муромской детской больницы', city: 'Муром', customer: 'ГБУЗ Владимирской области «Муромская районная детская больница»', summary: 'Строительство детского поликлинического отделения. Адрес: ул. Островского, д. 2а.' },
  { title: 'Пристройка к городской поликлинике № 1 ЦГКБ г. Реутов', city: 'Реутов', customer: 'ГКУ Московской области «Дирекция заказчика капитального строительства»', summary: 'Строительство пристройки к городской поликлинике. Адрес: ул. Гагарина, д. 4.' },
  { title: 'Капитальный ремонт здания музея', city: 'Москва', customer: 'ФГБУК «Государственный музей искусства народов Востока»', summary: 'Капитальный ремонт здания музея. Адрес: ул. Зоологическая, д. 13, стр. 2.' },
  { title: 'Реконструкция стадиона «Олимп»', city: 'Красная Горбатка', customer: 'Администрация Селивановского района Владимирской области', summary: 'Реконструкция стадиона в п. Красная Горбатка Селивановского района.' },
  { title: 'Конькобежные дорожки открытого типа с искусственным льдом', city: 'Муром', customer: 'МБУ «Спортивная школа олимпийского резерва имени А.А. Прокуророва»', summary: 'Выполнение строительных работ.' },
]
for (const pr of PROJECTS) {
  const slug = slugify(pr.title)
  const found = await payload.find({ collection: 'projects', where: { slug: { equals: slug } }, limit: 1, depth: 0, draft: true, overrideAccess: true })
  if (found.docs[0]) continue
  log(`create project (draft): ${pr.title}`)
  await payload.create({
    collection: 'projects',
    draft: true,
    overrideAccess: true,
    context: ctx,
    data: {
      title: pr.title,
      slug,
      city: pr.city,
      summary: pr.summary,
      customerName: pr.customer,
      showCustomer: false,
      directions: (pr.directions ?? []).map((d) => dir[d]),
      _status: 'draft',
    } as never,
  })
}

log('done')
process.exit(0)
