import type { CollectionConfig } from 'payload'
import { anyone, isEditorOrAdmin } from '../access'
import { slugField } from '../hooks/slug'
import { CATALOG_TARGETS, revalidateCollection, revalidateOnDelete } from '../hooks/revalidate'
import { ATTR_KEY_RE, okpd2Validate } from '../lib/validators'
import { preventDeleteIfUsed } from './Directions'

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
      name: 'direction',
      label: 'Направление',
      type: 'relationship',
      relationTo: 'directions',
      required: true,
      index: true,
      filterOptions: { type: { equals: 'catalog' } }, // категории только у направлений-каталогов
    },
    { name: 'order', label: 'Порядок', type: 'number', defaultValue: 100, admin: { position: 'sidebar' } },
    { name: 'shortDescription', label: 'Кратко', type: 'textarea', maxLength: 200 },
    { name: 'cover', label: 'Обложка', type: 'upload', relationTo: 'media' },
    { name: 'description', label: 'Текст категории (SEO)', type: 'richText' },
    { name: 'okpd2', label: 'ОКПД2 по умолчанию для товаров', type: 'text', validate: okpd2Validate },
    {
      name: 'attributeSet',
      label: 'Набор характеристик товаров категории',
      type: 'array',
      maxRows: 15,
      admin: { description: 'Эти строки появятся в каждом товаре категории после сохранения черновика' },
      fields: [
        {
          name: 'key',
          label: 'Ключ (латиница)',
          type: 'text',
          required: true,
          validate: (v: unknown) =>
            typeof v === 'string' && ATTR_KEY_RE.test(v) ? true : 'Только латиница, цифры и _, например seats_count',
        },
        { name: 'label', label: 'Название', type: 'text', required: true, maxLength: 60 },
        { name: 'unit', label: 'Единица', type: 'text', maxLength: 10 },
        { name: 'required', label: 'Обязательно', type: 'checkbox', defaultValue: false },
      ],
    },
  ],
}
