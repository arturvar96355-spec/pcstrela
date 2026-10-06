// Данные заказчика (реквизиты, телефон, изделия, сертификат). Идемпотентен, можно запускать повторно.
// Запуск: docker compose --profile tools run --rm seed pnpm tsx scripts/apply-client-data.ts
import { getPayload } from 'payload'
import fs from 'node:fs'
import path from 'node:path'
import config from '../src/payload.config'

const payload = await getPayload({ config })
const ctx = { disableRevalidate: true }
const log = (m: string) => console.log(`[client-data] ${m}`)
const ASSETS = path.join(process.cwd(), 'scripts', 'seed-assets')

const lexical = (...paragraphs: string[]) => ({
  root: {
    type: 'root',
    format: '',
    indent: 0,
    version: 1,
    direction: 'ltr',
    children: paragraphs.map((text) => ({
      type: 'paragraph',
      format: '',
      indent: 0,
      version: 1,
      direction: 'ltr',
      children: [{ type: 'text', text, detail: 0, format: 0, mode: 'normal', style: '', version: 1 }],
    })),
  },
})

async function findOne(collection: 'directions' | 'categories' | 'products' | 'documents' | 'media', where: Record<string, unknown>) {
  const r = await payload.find({ collection, where: where as never, limit: 1, depth: 0, overrideAccess: true })
  return r.docs[0] as unknown as { id: string; [k: string]: unknown } | undefined
}

async function upload(collection: 'media' | 'product-images' | 'files', file: string, mimetype: string, data: Record<string, unknown>, match: Record<string, unknown>) {
  const found = await payload.find({ collection, where: match as never, limit: 1, depth: 0, overrideAccess: true })
  if (found.docs[0]) return found.docs[0].id as string
  const buf = fs.readFileSync(path.join(ASSETS, file))
  log(`upload ${collection}: ${file}`)
  const doc = await payload.create({
    collection,
    data: data as never,
    file: { data: buf, mimetype, name: file, size: buf.length },
    overrideAccess: true,
    context: ctx,
  })
  return doc.id as string
}

// --- настройки сайта ---
const s = await payload.findGlobal({ slug: 'site-settings', depth: 0, overrideAccess: true })
const phones = (s.phones ?? []) as Array<{ number: string }>
const seedPhone = phones.length === 0 || phones.every((p) => p.number === '+7 985 975-03-50')
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
  } as never,
})
log('настройки сайта обновлены')

// --- направления и категории ---
const facades = await findOne('directions', { slug: { equals: 'fasadnye-sistemy' } })
const doorsDir = await findOne('directions', { slug: { equals: 'protivopozharnye-dveri' } })
if (!facades || !doorsDir) throw new Error('Нет направлений. Сначала выполните seed.')
if (facades.type !== 'catalog') {
  await payload.update({ collection: 'directions', id: facades.id, data: { type: 'catalog' }, overrideAccess: true, context: ctx })
  log('Фасадные системы: теперь каталог')
}

const doorAttrs = [
  { key: 'leaves', label: 'Количество створок' },
  { key: 'glazing', label: 'Остекление' },
]
let doorsCat = await findOne('categories', { slug: { equals: 'dveri-protivopozharnye' } })
const oldDoors = await findOne('categories', { slug: { equals: 'dveri-ei-60' } })
if (oldDoors) {
  if (!doorsCat) {
    await payload.update({
      collection: 'categories',
      id: oldDoors.id,
      data: { title: 'Двери стальные противопожарные', slug: 'dveri-protivopozharnye', attributeSet: doorAttrs },
      overrideAccess: true,
      context: ctx,
    })
    doorsCat = await findOne('categories', { slug: { equals: 'dveri-protivopozharnye' } })
    log('категория дверей переименована')
  } else {
    await payload.delete({ collection: 'categories', id: oldDoors.id, overrideAccess: true, context: ctx }).catch(() => undefined)
  }
}
if (!doorsCat) {
  doorsCat = (await payload.create({
    collection: 'categories',
    data: { title: 'Двери стальные противопожарные', slug: 'dveri-protivopozharnye', direction: doorsDir.id, order: 10, attributeSet: doorAttrs } as never,
    overrideAccess: true,
    context: ctx,
  })) as never
}

let casCat = await findOne('categories', { slug: { equals: 'kassety-fasadnye' } })
if (!casCat) {
  casCat = (await payload.create({
    collection: 'categories',
    data: {
      title: 'Кассеты фасадные',
      slug: 'kassety-fasadnye',
      direction: facades.id,
      order: 10,
      attributeSet: [
        { key: 'steel_thickness', label: 'Толщина стали', unit: 'мм' },
        { key: 'fastening', label: 'Тип крепления' },
      ],
    } as never,
    overrideAccess: true,
    context: ctx,
  })) as never
  log('создана категория «Кассеты фасадные»')
}

// --- изделия ---
const img = async (file: string, alt: string) =>
  upload('product-images', file, 'image/jpeg', { alt }, { alt: { equals: alt } })

if (!(await findOne('products', { sku: { equals: 'КФ-01' } }))) {
  const gallery = [
    await img('kassety-1.jpg', 'Фасадная кассета из стали с порошковой окраской, вид спереди'),
    await img('kassety-2.jpg', 'Фасадные кассеты в сборе с порошковой окраской, открытого и закрытого типа'),
  ]
  await payload.create({
    collection: 'products',
    overrideAccess: true,
    context: ctx,
    data: {
      title: 'Кассеты фасадные',
      sku: 'КФ-01',
      direction: facades.id,
      category: casCat!.id,
      shortDescription: 'Для вентилируемых фасадов зданий и сооружений. Закрытого и открытого типа крепления.',
      gallery,
      description: lexical(
        'Фасадные кассеты нужны для производства вентилируемых фасадов на зданиях и сооружениях.',
        'Выпускаются кассеты закрытого и открытого типа крепления.',
      ),
      materials: [{ material: 'Оцинкованная сталь толщиной от 0,5 до 1,2 мм' }],
      coating: 'Полимерное порошковое по каталогу RAL',
      attributes: [
        { key: 'steel_thickness', value: 'от 0,5 до 1,2' },
        { key: 'fastening', value: 'закрытый и открытый' },
      ],
      featured: true,
      order: 10,
      _status: 'published',
    } as never,
  })
  log('создано изделие КФ-01')
}

if (!(await findOne('products', { sku: { equals: 'ПД-01' } }))) {
  const gallery = [await img('dver-1.jpg', 'Стальная противопожарная дверь с замком и ручкой')]
  await payload.create({
    collection: 'products',
    overrideAccess: true,
    context: ctx,
    data: {
      title: 'Двери стальные противопожарные дымогазонепроницаемые',
      sku: 'ПД-01',
      direction: doorsDir.id,
      category: doorsCat!.id,
      shortDescription: 'Однопольные и двупольные, с остеклением и без. Сдерживают распространение огня, дыма и токсичных газов.',
      gallery,
      description: lexical(
        'Двери стальные противопожарные дымогазонепроницаемые, однопольные и двупольные, с остеклением и без.',
        'Предназначены для заполнения проёмов в противопожарных преградах (стенах, перегородках и т.д.). Основная задача — сдерживать распространение огня, дыма и токсичных газов.',
      ),
      materials: [{ material: 'Сталь' }],
      attributes: [
        { key: 'leaves', value: 'однопольные и двупольные' },
        { key: 'glazing', value: 'с остеклением и без' },
      ],
      featured: true,
      order: 10,
      _status: 'published',
    } as never,
  })
  log('создано изделие ПД-01')
}

// обложка направления «Противопожарные двери»
if (!doorsDir.cover) {
  const cover = await upload('media', 'dver-1.jpg', 'image/jpeg', { alt: 'Стальная противопожарная дверь' }, { alt: { equals: 'Стальная противопожарная дверь' } })
  await payload.update({ collection: 'directions', id: doorsDir.id, data: { cover }, overrideAccess: true, context: ctx })
}

// --- сертификат ---
const NUMBER = 'ЦОТК.RU.ПР002.Н.00310'
if (!(await findOne('documents', { number: { equals: NUMBER } }))) {
  const file = await upload(
    'files',
    'sertifikat-fasadnye-kassety.pdf',
    'application/pdf',
    { title: 'Сертификат соответствия на кассеты фасадные' },
    { title: { equals: 'Сертификат соответствия на кассеты фасадные' } },
  )
  const preview = await upload('media', 'sertifikat-preview.jpg', 'image/jpeg', { alt: 'Сертификат соответствия ЦОТК на фасадные кассеты' }, { alt: { equals: 'Сертификат соответствия ЦОТК на фасадные кассеты' } })
  await payload.create({
    collection: 'documents',
    overrideAccess: true,
    context: ctx,
    data: {
      title: 'Сертификат соответствия на кассеты стальные фасадные',
      docType: 'certificate',
      file,
      preview,
      number: NUMBER,
      issuedAt: '2024-10-28T00:00:00.000Z',
      validUntil: '2029-10-27T00:00:00.000Z',
      directions: [facades.id],
      showOnHome: true,
    } as never,
  })
  log('добавлен сертификат')
}

log('готово')
process.exit(0)
