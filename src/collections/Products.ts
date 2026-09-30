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
  access: {
    read: publishedOrLoggedIn,
    create: isEditorOrAdmin,
    update: isEditorOrAdmin,
    delete: isEditorOrAdmin,
  },
  hooks: {
    beforeChange: [syncAttributes],
    afterChange: [revalidateCollection(CATALOG_TARGETS)],
    afterDelete: [revalidateOnDelete(CATALOG_TARGETS)],
  },
  fields: [
    { name: 'title', label: 'Название', type: 'text', required: true, maxLength: 120 },
    slugField(['title', 'sku']),
    {
      name: 'sku',
      label: 'Артикул',
      type: 'text',
      required: true,
      unique: true,
      index: true,
      validate: (v: unknown) =>
        typeof v === 'string' && SKU_RE.test(v)
          ? true
          : 'Заглавные буквы, цифры, точка и дефис, 2–30 символов. Пример: СК-014',
    },
    {
      name: 'direction',
      label: 'Направление',
      type: 'relationship',
      relationTo: 'directions',
      required: true,
      index: true,
      filterOptions: { type: { equals: 'catalog' } },
    },
    {
      name: 'category',
      label: 'Категория',
      type: 'relationship',
      relationTo: 'categories',
      required: true,
      index: true,
      filterOptions: ({ data }) => (data?.direction ? { direction: { equals: data.direction } } : true),
    },
    { name: 'shortDescription', label: 'Кратко (под названием)', type: 'textarea', maxLength: 300 },
    {
      name: 'gallery',
      label: 'Фото (первое — главное)',
      type: 'upload',
      relationTo: 'product-images',
      hasMany: true,
      minRows: 1,
      maxRows: 12,
      required: true,
    },
    {
      name: 'drawing',
      label: 'Чертёж (изображение для вкладки «Чертёж»)',
      type: 'upload',
      relationTo: 'product-images',
    },
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
    {
      name: 'materials',
      label: 'Материалы',
      type: 'array',
      maxRows: 8,
      fields: [{ name: 'material', type: 'text', required: true, maxLength: 80 }],
    },
    {
      name: 'coating',
      label: 'Покрытие',
      type: 'text',
      maxLength: 150,
      admin: { description: 'Пример: порошковая окраска по RAL, цвет по выбору' },
    },
    {
      type: 'row',
      fields: [
        { name: 'productionDaysMin', label: 'Срок изготовления от, раб. дн.', type: 'number', min: 1, max: 365 },
        {
          name: 'productionDaysMax',
          label: 'до, раб. дн.',
          type: 'number',
          min: 1,
          max: 365,
          validate: (v: unknown, { siblingData }: { siblingData: { productionDaysMin?: number } }) =>
            v == null || siblingData.productionDaysMin == null || (v as number) >= siblingData.productionDaysMin
              ? true
              : '«До» должно быть не меньше «от»',
        },
        { name: 'warrantyMonths', label: 'Гарантия, мес.', type: 'number', min: 1, max: 360 },
      ],
    },
    { name: 'okpd2', label: 'ОКПД2', type: 'text', validate: okpd2Validate },
    {
      name: 'inGispRegistry',
      label: 'В реестре российской промышленной продукции (ГИСП)',
      type: 'checkbox',
      defaultValue: false,
    },
    {
      name: 'gispRegistryNumber',
      label: 'Номер реестровой записи',
      type: 'text',
      maxLength: 50,
      admin: { condition: (d) => Boolean(d?.inGispRegistry) },
    },
    {
      name: 'attributes',
      label: 'Характеристики категории',
      type: 'array',
      admin: {
        description: 'Строки создаются из набора характеристик категории при сохранении. Заполните только «Значение».',
      },
      fields: [
        { name: 'key', type: 'text', admin: { hidden: true } },
        {
          type: 'row',
          fields: [
            { name: 'label', label: 'Характеристика', type: 'text', admin: { readOnly: true } },
            { name: 'value', label: 'Значение', type: 'text', maxLength: 120 },
            { name: 'unit', label: 'Ед.', type: 'text', admin: { readOnly: true, width: '80px' } },
          ],
        },
      ],
    },
    {
      name: 'relatedProducts',
      label: 'Похожие товары',
      type: 'relationship',
      relationTo: 'products',
      hasMany: true,
      maxRows: 4,
    },
    { name: 'featured', label: 'Показывать на главной', type: 'checkbox', defaultValue: false, admin: { position: 'sidebar' } },
    { name: 'order', label: 'Порядок', type: 'number', defaultValue: 100, admin: { position: 'sidebar' } },
  ],
}
