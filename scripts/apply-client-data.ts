// Данные заказчика: реквизиты, направления с текстами и фото, объект, сертификаты, страницы.
// Сайт информационный (без каталога и артикулов). Скрипт можно запускать повторно.
// Запуск на сервере: docker compose --profile tools run --rm seed pnpm tsx scripts/apply-client-data.ts
import { getPayload } from 'payload'
import fs from 'node:fs'
import path from 'node:path'
import config from '../src/payload.config'

const payload = await getPayload({ config })
const ctx = { disableRevalidate: true }
const log = (m: string) => console.log(`[client-data] ${m}`)
const ASSETS = path.join(process.cwd(), 'scripts', 'seed-assets')

// ---------- помощники ----------
type Node = Record<string, unknown>
const text = (t: string): Node => ({ type: 'text', text: t, detail: 0, format: 0, mode: 'normal', style: '', version: 1 })
const block = (type: string, extra: Node, children: Node[]): Node => ({ type, format: '', indent: 0, version: 1, direction: 'ltr', ...extra, children })
const p = (t: string) => block('paragraph', {}, [text(t)])
const h2 = (t: string) => block('heading', { tag: 'h2' }, [text(t)])
const ul = (items: string[]) =>
  block(
    'list',
    { listType: 'bullet', start: 1, tag: 'ul' },
    items.map((t, i) => block('listitem', { value: i + 1 }, [text(t)])),
  )
const rich = (...nodes: Node[]) => ({
  root: { type: 'root', format: '', indent: 0, version: 1, direction: 'ltr', children: nodes },
})

type Coll = 'directions' | 'projects' | 'documents' | 'media' | 'products' | 'categories' | 'pages' | 'files'
async function findOne(collection: Coll, where: Record<string, unknown>) {
  const r = await payload.find({ collection, where: where as never, limit: 1, depth: 0, draft: true, overrideAccess: true })
  return r.docs[0] as unknown as ({ id: string } & Record<string, unknown>) | undefined
}

// загрузка файла: повторно не загружает, если запись с таким названием/alt уже есть
async function upload(collection: 'media' | 'files', file: string, mimetype: string, data: Record<string, string>) {
  const key = collection === 'media' ? { alt: { equals: data.alt } } : { title: { equals: data.title } }
  const found = await findOne(collection, key)
  if (found) return found.id
  const buf = fs.readFileSync(path.join(ASSETS, file))
  log(`загрузка: ${file}`)
  const doc = await payload.create({
    collection,
    data: data as never,
    file: { data: buf, mimetype, name: path.basename(file), size: buf.length },
    overrideAccess: true,
    context: ctx,
  })
  return doc.id as string
}

const photo = (file: string, alt: string) => upload('media', file, 'image/jpeg', { alt })

// ---------- фото ----------
const C = (n: string) => `client/${n}.jpg`
const img = {
  fasad1: await photo(C('majdarovo-fasad-1'), 'Детский сад в пос. Майдарово: фасад с цветными кассетами'),
  fasad2: await photo(C('majdarovo-fasad-2'), 'Детский сад в пос. Майдарово: фасад из белых кассет'),
  plosh1: await photo(C('majdarovo-ploshchadka-1'), 'Ограждение детской площадки в пос. Майдарово'),
  plosh2: await photo(C('majdarovo-ploshchadka-2'), 'Детские площадки с металлическим ограждением и беседками'),
  plosh3: await photo(C('majdarovo-ploshchadka-3'), 'Детская площадка с беседками и ограждением'),
  plosh4: await photo(C('majdarovo-ploshchadka-4'), 'Ограждение детской площадки, вид сверху'),
  bes1: await photo(C('majdarovo-besedka-1'), 'Беседка с металлическим каркасом и зелёными панелями'),
  bes2: await photo(C('majdarovo-besedka-2'), 'Беседка изнутри: панели с рисунком персонажей'),
  dver1: await photo(C('dver-dvustvorchataya-1'), 'Двупольная стальная противопожарная дверь'),
  dver2: await photo(C('dver-dvustvorchataya-2'), 'Двупольная стальная дверь с порошковой окраской'),
  dver0: await photo('dver-1.jpg', 'Стальная противопожарная дверь'),
  boks1: await photo(C('boks-1'), 'Шумоизоляционный бокс с окном и замками'),
  boks2: await photo(C('boks-2'), 'Шумоизоляционный бокс, общий вид'),
  boks3: await photo(C('boks-3'), 'Шумоизоляционные боксы на производстве'),
  kas1: await photo('kassety-1.jpg', 'Фасадная кассета из стали с порошковой окраской'),
  kas2: await photo('kassety-2.jpg', 'Фасадные кассеты в сборе с порошковой окраской'),
  kas3: await photo(C('kassety-na-podvese'), 'Окрашенные фасадные кассеты на подвесе'),
  kas4: await photo(C('kamera-polimerizacii'), 'Фасадные кассеты в камере полимеризации'),
  lazer1: await photo(C('lazer-wattsan'), 'Станок лазерной резки Wattsan'),
  lazer2: await photo(C('lazer-metalmaster'), 'Станок лазерной резки Metal Master'),
  press: await photo(C('press-vartek'), 'Гидравлический листогибочный пресс Vartek'),
  kamery: await photo(C('kamery-pokraski'), 'Камеры порошковой окраски'),
  zdanie: await photo(C('zdanie-proizvodstva'), 'Производственное здание'),
}
const stock = async (alt: string) => (await findOne('media', { alt: { equals: alt } }))?.id
const stockBench = await stock('Скамейка с деревянным сиденьем на стальном каркасе')
const stockUrn = await stock('Урна для раздельного сбора мусора')
const stockPergola = await stock('Навес с металлическим каркасом на площадке')

// ---------- настройки сайта ----------
const s = await payload.findGlobal({ slug: 'site-settings', depth: 0, overrideAccess: true })
const phones = (s.phones ?? []) as Array<{ number: string }>
const seedPhone = phones.length === 0 || phones.every((x) => x.number === '+7 985 975-03-50')
await payload.updateGlobal({
  slug: 'site-settings',
  overrideAccess: true,
  context: ctx,
  data: {
    ...(seedPhone ? { phones: [{ number: '+7 985 129-77-67', primary: true }] } : {}),
    ...(s.workingHours === 'пн–пт 9:00–18:00' ? { workingHours: '' } : {}),
    legalName: s.legalName || 'Общество с ограниченной ответственностью «ПК СТРЕЛА»',
    inn: s.inn || '7733441305',
    kpp: s.kpp || '773301001',
    ogrn: s.ogrn || '1247700224705',
    legalAddress:
      s.legalAddress || '125362, г. Москва, вн.тер.г. Муниципальный округ Покровское-Стрешнево, ул. Тушинская, д. 11, помещ. 2П',
    productionAddress: s.productionAddress || '305025, Курская область, г. Курск, Магистральный проезд, д. 17Б, оф. 8',
    bankDetails:
      s.bankDetails ||
      'Банк: Ярославский филиал ПАО «Промсвязьбанк». БИК 047888760. Р/с 40702810102000129086. К/с 30101810300000000760.',
    ...((s.facts ?? []).length
      ? {}
      : {
          facts: [
            { value: '900 м²', label: 'производственных площадей' },
            { value: '10', label: 'человек в команде' },
            { value: '2', label: 'станка лазерной резки' },
            { value: '2024', label: 'год основания' },
          ],
        }),
  } as never,
})
log('настройки сайта обновлены')

// ---------- уборка прежнего каталога (сайт информационный) ----------
for (const coll of ['products', 'categories'] as const) {
  const all = await payload.find({ collection: coll, limit: 500, depth: 0, pagination: false, draft: true, overrideAccess: true })
  for (const doc of all.docs) {
    await payload.delete({ collection: coll, id: doc.id, overrideAccess: true, context: ctx }).catch((e: Error) => log(`не удалось удалить ${coll}: ${e.message}`))
  }
  if (all.docs.length) log(`удалено ${coll}: ${all.docs.length}`)
}
for (const slug of ['ulichnaya-mebel', 'teplovye-uzly', 'proektirovanie-kotelnyh']) {
  const d = await findOne('directions', { slug: { equals: slug } })
  if (!d) continue
  await payload.delete({ collection: 'directions', id: d.id, overrideAccess: true, context: ctx }).catch((e: Error) => log(`не удалось удалить направление ${slug}: ${e.message}`))
  log(`удалено направление ${slug}`)
}

// ---------- направления ----------
type Dir = {
  slug: string
  title: string
  order: number
  short: string
  hero: string
  okpd2?: string
  cover: string
  gallery: Array<string | undefined>
  body: Node[]
  scope: string[]
  objects?: string[]
}
const DIRS: Dir[] = [
  {
    slug: 'fasadnye-sistemy',
    title: 'Фасадные кассеты',
    order: 10,
    short: 'Кассеты закрытого и открытого типа крепления для вентилируемых фасадов зданий и сооружений.',
    hero: 'Кассеты для вентилируемых фасадов: закрытого и открытого типа крепления, из оцинкованной стали с порошковым покрытием.',
    okpd2: '25.11.23.119',
    cover: img.fasad1,
    gallery: [img.fasad1, img.fasad2, img.kas3, img.kas4, img.kas1, img.kas2],
    body: [
      p('Фасадные кассеты нужны для производства вентилируемых фасадов на зданиях и сооружениях.'),
      p('Выпускаем кассеты закрытого и открытого типа крепления из оцинкованной стали толщиной от 0,5 до 1,2 мм. Покрытие полимерное порошковое, цвет по каталогу RAL.'),
      p('На кассеты выдан сертификат соответствия, он размещён в разделе «Документы».'),
    ],
    scope: ['Кассеты закрытого типа крепления', 'Кассеты открытого типа крепления', 'Оцинкованная сталь толщиной от 0,5 до 1,2 мм', 'Полимерное порошковое покрытие по каталогу RAL'],
    objects: ['Здания и сооружения'],
  },
  {
    slug: 'protivopozharnye-dveri',
    title: 'Противопожарные двери',
    order: 20,
    short: 'Двери стальные противопожарные дымогазонепроницаемые, однопольные и двупольные, с остеклением и без.',
    hero: 'Стальные противопожарные дымогазонепроницаемые двери: однопольные и двупольные, с остеклением и без.',
    cover: img.dver1,
    gallery: [img.dver1, img.dver2, img.dver0],
    body: [
      p('Двери стальные противопожарные дымогазонепроницаемые изготавливаем однопольными и двупольными, с остеклением и без.'),
      p('Предназначены для заполнения проёмов в противопожарных преградах: стенах, перегородках и т.д. Основная задача двери — сдерживать распространение огня, дыма и токсичных газов.'),
    ],
    scope: ['Однопольные двери', 'Двупольные двери', 'С остеклением и без остекления', 'Дымогазонепроницаемые'],
    objects: ['Проёмы в противопожарных преградах: стены, перегородки'],
  },
  {
    slug: 'shumozashchitnye-kozhuhi',
    title: 'Шумоизоляционные боксы',
    order: 30,
    short: 'Короба для снижения уровня шума от работающего оборудования, изготавливаются индивидуально.',
    hero: 'Шумоизоляционные боксы (короба) для снижения шума от оборудования на производствах. Изготавливаем индивидуально.',
    okpd2: '32.99.59',
    cover: img.boks2,
    gallery: [img.boks1, img.boks2, img.boks3],
    body: [
      p('Шумоизоляционные боксы (короба) предназначены для снижения уровня шума от работающего оборудования на производствах.'),
      p('Изготавливаются индивидуально под оборудование заказчика. Выпускаем по техническим условиям ТУ 32.99.59-004-89298802-2025, на боксы получен сертификат соответствия (раздел «Документы»).'),
    ],
    scope: ['Снижение уровня шума от работающего оборудования', 'Индивидуальное изготовление под размеры и оборудование'],
    objects: ['Производственные помещения'],
  },
  {
    slug: 'ograzhdeniya',
    title: 'Металлические ограждения',
    order: 40,
    short: 'Ограждения из металла, в том числе ограждения детских площадок.',
    hero: 'Изготавливаем различные ограждения из металла, в том числе ограждения детских площадок.',
    cover: img.plosh2,
    gallery: [img.plosh1, img.plosh2, img.plosh3, img.plosh4],
    body: [
      p('Изготавливаем различные ограждения из металла. Одна из наших работ: ограждения детских площадок и беседки для детского сада в посёлке Майдарово Солнечногорского района Московской области.'),
    ],
    scope: ['Ограждения детских площадок', 'Различные ограждения из металла'],
  },
  {
    slug: 'maf',
    title: 'Малые архитектурные формы',
    order: 50,
    short: 'Скамейки, урны, навесы, беседки и другие изделия для благоустройства.',
    hero: 'Малые архитектурные формы из металла: скамейки, урны, навесы, беседки и другие изделия для благоустройства.',
    cover: img.bes1,
    gallery: [img.bes1, img.bes2, stockBench, stockPergola, stockUrn],
    body: [p('Выпускаем малые архитектурные формы (МАФ): скамейки, урны, навесы, беседки и другие изделия для благоустройства территорий.')],
    scope: ['Скамейки', 'Урны', 'Навесы', 'Беседки'],
  },
]

const dirId: Record<string, string> = {}
for (const d of DIRS) {
  const data = {
    title: d.title,
    slug: d.slug,
    type: 'service',
    order: d.order,
    shortDescription: d.short,
    heroText: d.hero,
    ...(d.okpd2 ? { okpd2: d.okpd2 } : {}),
    cover: d.cover,
    gallery: d.gallery.filter(Boolean),
    description: rich(...d.body),
    service: {
      workScope: d.scope.map((item) => ({ item })),
      objectTypes: (d.objects ?? []).map((item) => ({ item })),
    },
  }
  const found = await findOne('directions', { slug: { equals: d.slug } })
  if (found) {
    await payload.update({ collection: 'directions', id: found.id, data: data as never, overrideAccess: true, context: ctx })
    dirId[d.slug] = found.id
  } else {
    const doc = await payload.create({ collection: 'directions', data: data as never, overrideAccess: true, context: ctx })
    dirId[d.slug] = doc.id as string
    log(`создано направление ${d.slug}`)
  }
}
log('направления обновлены')

// ---------- объект: детский сад в Майдарово ----------
if (!(await findOne('projects', { slug: { equals: 'detskij-sad-majdarovo' } }))) {
  await payload.create({
    collection: 'projects',
    overrideAccess: true,
    context: ctx,
    data: {
      title: 'Детский сад, пос. Майдарово',
      slug: 'detskij-sad-majdarovo',
      city: 'пос. Майдарово, Солнечногорский район, Московская область',
      customerName: 'ЗАО «МНК ГРУПП»',
      showCustomer: true,
      summary: 'Фасад площадью 2800 м², ограждения детских площадок и беседки.',
      directions: [dirId['fasadnye-sistemy'], dirId['ograzhdeniya'], dirId['maf']],
      cover: img.fasad1,
      gallery: [img.fasad1, img.fasad2, img.plosh2, img.plosh3, img.plosh1, img.plosh4, img.bes1, img.bes2],
      description: rich(
        p('Для детского сада в посёлке Майдарово Солнечногорского района Московской области выполнили:'),
        ul(['фасад площадью 2800 м²', 'ограждения детских площадок', 'беседки']),
      ),
      featured: true,
      _status: 'published',
    } as never,
  })
  log('создан объект «Детский сад, пос. Майдарово»')
}

// ---------- сертификаты ----------
async function certificate(o: { number: string; title: string; file: string; preview: string; fileTitle: string; previewAlt: string; issued: string; until: string; direction: string }) {
  if (await findOne('documents', { number: { equals: o.number } })) return
  const file = await upload('files', o.file, 'application/pdf', { title: o.fileTitle })
  const preview = await photo(o.preview, o.previewAlt)
  await payload.create({
    collection: 'documents',
    overrideAccess: true,
    context: ctx,
    data: {
      title: o.title,
      docType: 'certificate',
      file,
      preview,
      number: o.number,
      issuedAt: o.issued,
      validUntil: o.until,
      directions: [dirId[o.direction]],
      showOnHome: true,
    } as never,
  })
  log(`добавлен документ: ${o.title}`)
}
await certificate({
  number: 'ЦОТК.RU.ПР002.Н.00310',
  title: 'Сертификат соответствия на кассеты стальные фасадные',
  file: 'sertifikat-fasadnye-kassety.pdf',
  preview: 'sertifikat-preview.jpg',
  fileTitle: 'Сертификат соответствия на кассеты фасадные',
  previewAlt: 'Сертификат соответствия ЦОТК на фасадные кассеты',
  issued: '2024-10-28T00:00:00.000Z',
  until: '2029-10-27T00:00:00.000Z',
  direction: 'fasadnye-sistemy',
})
await certificate({
  number: 'РОСС RU.32623.ОС15.14394',
  title: 'Сертификат соответствия на шумоизоляционный бокс',
  file: 'sertifikat-shumoizolyacionnyj-boks.pdf',
  preview: 'sertifikat-boks-preview.jpg',
  fileTitle: 'Сертификат соответствия на шумоизоляционный бокс',
  previewAlt: 'Сертификат соответствия на шумоизоляционный бокс',
  issued: '2026-01-20T00:00:00.000Z',
  until: '2029-01-19T00:00:00.000Z',
  direction: 'shumozashchitnye-kozhuhi',
})

// ---------- главная ----------
await payload.updateGlobal({
  slug: 'home-page',
  overrideAccess: true,
  context: ctx,
  data: {
    heroImage: img.fasad1,
    heroTitle: 'Фасадные кассеты, противопожарные двери и металлоконструкции',
    heroSubtitle:
      'Собственное производство в Курске: лазерная резка, гибка, сварка и порошковая окраска. Шумоизоляционные боксы, металлические ограждения и малые архитектурные формы.',
    productionImages: [img.lazer1, img.press, img.kas4],
    productionText:
      'Производственные площади компании составляют 900 м². В распоряжении два станка лазерной резки листового металла (1,5 и 3 кВт), гидравлический пресс шириной 2,8 м, две камеры полимеризации длиной 3 и 6 м и три сварочных поста.',
    audiences: [
      { title: 'Госзаказчикам', text: 'Реквизиты, сертификаты соответствия и выполненные объекты для закупок по 44-ФЗ и 223-ФЗ.', href: '/goszakazchikam' },
      { title: 'Выполненные объекты', text: 'Фасады, ограждения и беседки: посмотрите примеры наших работ.', href: '/obekty' },
    ],
  } as never,
})
log('главная обновлена')

// ---------- страницы ----------
const OPERATOR = 'ООО «ПК СТРЕЛА» (ИНН 7733441305, ОГРН 1247700224705, юридический адрес: 125362, г. Москва, вн.тер.г. Муниципальный округ Покровское-Стрешнево, ул. Тушинская, д. 11, помещ. 2П)'
const PAGES: Array<{ slug: string; lead?: string; cover?: string; gallery?: string[]; version?: string; body: Node[] }> = [
  {
    slug: 'o-kompanii',
    lead: 'ООО «ПК Стрела» выпускает фасадные кассеты, противопожарные двери, шумоизоляционные боксы, металлические ограждения и малые архитектурные формы.',
    cover: img.zdanie,
    body: [
      h2('Чем мы занимаемся'),
      ul(['Фасадные кассеты для вентилируемых фасадов', 'Стальные противопожарные двери', 'Шумоизоляционные боксы (короба)', 'Ограждения из металла', 'Малые архитектурные формы: скамейки, урны, навесы, беседки']),
      h2('О компании'),
      p('Компания работает с марта 2024 года. Производство расположено в Курске, производственные площади составляют 900 м². В команде 10 человек.'),
      p('Продукцию изготавливаем на собственном оборудовании: станки лазерной резки, гидравлический листогибочный пресс, камеры полимеризации и сварочные посты.'),
    ],
  },
  {
    slug: 'proizvodstvo',
    lead: 'Собственное производство в Курске: 900 м² площадей, лазерная резка, гибка, сварка и порошковая окраска.',
    gallery: [img.lazer1, img.lazer2, img.press, img.kamery, img.kas4, img.kas3, img.zdanie],
    body: [
      h2('Станочный парк'),
      ul([
        'Два станка лазерной резки листового металла мощностью 1,5 кВт и 3 кВт',
        'Гидравлический пресс шириной 2,8 м',
        'Две камеры полимеризации длиной 3 м и 6 м',
        'Три сварочных поста',
        'Вспомогательное оборудование',
      ]),
      h2('Площади и команда'),
      p('Производственные площади компании составляют 900 м². В компании работает 10 человек.'),
    ],
  },
  {
    slug: 'goszakazchikam',
    lead: 'Реквизиты, сертификаты соответствия и сведения о выполненных объектах размещены на сайте.',
    body: [
      p('Страницы сайта можно использовать как источник сведений о компании и продукции. Реквизиты — в разделе «Контакты», сертификаты соответствия — в разделе «Документы», выполненные работы — в разделе «Объекты».'),
      p('Если нужны дополнительные документы или коммерческое предложение, оставьте запрос на сайте или позвоните нам.'),
    ],
  },
  {
    slug: 'politika-konfidencialnosti',
    version: '2026-10-06',
    lead: 'Как мы обрабатываем персональные данные, которые вы оставляете на сайте.',
    body: [
      h2('1. Общие положения'),
      p(`Настоящая политика описывает, как оператор персональных данных ${OPERATOR} (далее — Оператор) обрабатывает данные посетителей сайта и защищает их в соответствии с Федеральным законом от 27.07.2006 № 152-ФЗ «О персональных данных».`),
      h2('2. Какие данные мы собираем'),
      ul(['имя, номер телефона, адрес электронной почты, название организации и текст сообщения, которые вы указываете в форме обращения', 'технические данные: IP-адрес, сведения о браузере и устройстве, файлы cookie, данные о посещении страниц (собираются сервисом Яндекс Метрика только с вашего согласия на cookie)']),
      h2('3. Цели обработки'),
      ul(['ответ на ваше обращение и подготовка коммерческого предложения', 'связь с вами по вопросам заказа продукции', 'улучшение работы сайта']),
      h2('4. Основания обработки'),
      p('Данные обрабатываются на основании вашего согласия, которое вы даёте при отправке формы, отметив соответствующую галочку.'),
      h2('5. Хранение и передача данных'),
      p('Данные хранятся на серверах, расположенных на территории Российской Федерации. Мы не передаём данные третьим лицам, кроме случаев, предусмотренных законодательством. Данные хранятся до достижения целей обработки или до отзыва вами согласия.'),
      h2('6. Ваши права'),
      p('Вы вправе запросить сведения об обработке своих данных, потребовать их уточнения, блокирования или удаления, а также отозвать согласие. Для этого направьте письменное обращение Оператору по адресу места нахождения либо сообщите об этом по телефону, указанному на странице «Контакты».'),
      h2('7. Файлы cookie'),
      p('Подробности об использовании cookie изложены на странице «Политика cookie».'),
      h2('8. Изменения политики'),
      p('Оператор вправе изменять политику. Актуальная версия всегда доступна на этой странице.'),
    ],
  },
  {
    slug: 'soglasie-na-obrabotku',
    version: '2026-10-06',
    lead: 'Согласие на обработку персональных данных при отправке формы на сайте.',
    body: [
      p(`Отправляя форму на сайте, я свободно, своей волей и в своём интересе даю согласие оператору ${OPERATOR} на обработку моих персональных данных: имени, номера телефона, адреса электронной почты, наименования организации и сведений, указанных в сообщении.`),
      p('Цели обработки: ответ на моё обращение, подготовка коммерческого предложения и связь со мной по вопросам заказа продукции.'),
      p('Перечень действий: сбор, запись, систематизация, накопление, хранение, уточнение, использование, блокирование, удаление и уничтожение данных, с использованием средств автоматизации и без них.'),
      p('Согласие действует до достижения целей обработки либо до его отзыва. Я могу отозвать согласие, направив письменное обращение оператору по адресу его места нахождения.'),
    ],
  },
  {
    slug: 'cookie',
    version: '2026-10-06',
    lead: 'Какие файлы cookie использует сайт и как ими управлять.',
    body: [
      p('Cookie — небольшие файлы, которые сайт сохраняет в вашем браузере. Мы используем:'),
      ul(['необходимые cookie, без которых сайт не работает (в том числе хранение вашего выбора по cookie)', 'аналитические cookie сервиса Яндекс Метрика, которые помогают понять, как посетители пользуются сайтом']),
      p('Аналитические cookie включаются только после того, как вы нажмёте «Принять» в уведомлении о cookie. Если выбрать «Только необходимые», аналитика не подключается.'),
      p('Вы можете в любой момент удалить cookie в настройках браузера.'),
    ],
  },
]

for (const pg of PAGES) {
  const data = {
    lead: pg.lead,
    content: rich(...pg.body),
    ...(pg.cover ? { cover: pg.cover } : {}),
    ...(pg.gallery ? { gallery: pg.gallery } : {}),
    ...(pg.version ? { version: pg.version } : {}),
  }
  const found = await findOne('pages', { slug: { equals: pg.slug } })
  if (found) {
    await payload.update({ collection: 'pages', id: found.id, data: data as never, overrideAccess: true, context: ctx })
  } else {
    const title = pg.slug
    await payload.create({ collection: 'pages', data: { title, slug: pg.slug, ...data } as never, overrideAccess: true, context: ctx })
  }
}
log('страницы обновлены')

log('готово')
process.exit(0)
