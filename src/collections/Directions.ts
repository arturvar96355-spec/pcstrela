import type { CollectionBeforeDeleteHook, CollectionConfig } from 'payload'
import { anyone, isAdmin, isEditorOrAdmin } from '../access'
import { slugField } from '../hooks/slug'
import { CATALOG_TARGETS, revalidateCollection, revalidateOnDelete } from '../hooks/revalidate'

export const preventDeleteIfUsed =
  (child: 'categories' | 'products', field: string, label: string): CollectionBeforeDeleteHook =>
  async ({ req, id }) => {
    const { totalDocs } = await req.payload.count({
      collection: child,
      where: { [field]: { equals: id } },
      req,
    })
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
      name: 'type',
      label: 'Тип страницы',
      type: 'select',
      required: true,
      defaultValue: 'catalog',
      options: [
        { label: 'Каталог (типовые изделия)', value: 'catalog' },
        { label: 'Услуга (работа под заказ)', value: 'service' },
      ],
    },
    { name: 'order', label: 'Порядок', type: 'number', defaultValue: 100, admin: { position: 'sidebar' } },
    { name: 'shortDescription', label: 'Кратко (для плиток)', type: 'textarea', required: true, maxLength: 200 },
    { name: 'cover', label: 'Обложка', type: 'upload', relationTo: 'media' },
    { name: 'gallery', label: 'Фото (галерея на странице)', type: 'upload', relationTo: 'media', hasMany: true, maxRows: 20 },
    { name: 'heroText', label: 'Подзаголовок первого экрана', type: 'textarea', maxLength: 300 },
    { name: 'description', label: 'Описание', type: 'richText' },
    {
      name: 'okpd2',
      label: 'ОКПД2 группы продукции',
      type: 'text',
      admin: { description: 'Для страницы «Госзаказчикам». Пример: 31.01.12' },
    },
    {
      name: 'service',
      label: 'Содержимое страницы услуги',
      type: 'group',
      admin: { condition: (data) => data?.type === 'service' },
      fields: [
        {
          name: 'workScope',
          label: 'Состав работ',
          type: 'array',
          maxRows: 12,
          fields: [{ name: 'item', type: 'text', required: true, maxLength: 150 }],
        },
        {
          name: 'stages',
          label: 'Этапы',
          type: 'array',
          maxRows: 8,
          fields: [
            { name: 'title', type: 'text', required: true, maxLength: 60 },
            { name: 'text', type: 'textarea', maxLength: 300 },
          ],
        },
        {
          name: 'objectTypes',
          label: 'Для каких объектов',
          type: 'array',
          maxRows: 10,
          fields: [{ name: 'item', type: 'text', required: true, maxLength: 80 }],
        },
        {
          name: 'formHint',
          label: 'Подсказка в форме расчёта',
          type: 'text',
          maxLength: 200,
          defaultValue: 'Опишите объект, объём и сроки — подготовим расчёт за 1–2 рабочих дня',
        },
      ],
    },
  ],
}
