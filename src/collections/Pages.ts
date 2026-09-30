import type { CollectionConfig } from 'payload'
import { anyone, isAdmin, isEditorOrAdmin } from '../access'
import { revalidateCollection } from '../hooks/revalidate'

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
    { name: 'content', label: 'Текст', type: 'richText' },
    {
      name: 'gallery',
      label: 'Галерея (для «Производства»)',
      type: 'upload',
      relationTo: 'media',
      hasMany: true,
      maxRows: 30,
    },
    {
      name: 'version',
      label: 'Версия документа (для юридических страниц)',
      type: 'text',
      maxLength: 20,
      admin: { description: 'Пример: 2026-10-01. Меняйте при каждой правке текста согласия' },
    },
  ],
}
