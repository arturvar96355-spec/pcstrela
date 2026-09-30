import type { CollectionConfig } from 'payload'
import { isEditorOrAdmin, publishedOrLoggedIn } from '../access'
import { slugField } from '../hooks/slug'
import { PROJECTS_TARGETS, revalidateCollection, revalidateOnDelete } from '../hooks/revalidate'

export const Projects: CollectionConfig = {
  slug: 'projects',
  labels: { singular: 'Объект', plural: 'Объекты' },
  versions: { drafts: true, maxPerDoc: 20 },
  defaultSort: '-year',
  admin: { group: 'Контент', useAsTitle: 'title', defaultColumns: ['title', 'year', 'city', '_status'] },
  access: {
    read: publishedOrLoggedIn,
    create: isEditorOrAdmin,
    update: isEditorOrAdmin,
    delete: isEditorOrAdmin,
  },
  hooks: {
    afterChange: [revalidateCollection(PROJECTS_TARGETS)],
    afterDelete: [revalidateOnDelete(PROJECTS_TARGETS)],
  },
  fields: [
    { name: 'title', label: 'Название объекта', type: 'text', required: true, maxLength: 160 },
    slugField(),
    {
      type: 'row',
      fields: [
        {
          name: 'year',
          label: 'Год',
          type: 'number',
          index: true,
          validate: (v: unknown) =>
            v == null || (typeof v === 'number' && v >= 2000 && v <= new Date().getFullYear() + 1)
              ? true
              : 'Год от 2000 до следующего года',
        },
        { name: 'city', label: 'Город', type: 'text', required: true, maxLength: 80 },
      ],
    },
    { name: 'customerName', label: 'Заказчик', type: 'text', maxLength: 200 },
    {
      name: 'showCustomer',
      label: 'Показывать заказчика на сайте',
      type: 'checkbox',
      defaultValue: false,
      admin: { description: 'Включайте, только если в договоре нет запрета на публикацию' },
    },
    {
      name: 'directions',
      label: 'Направления',
      type: 'relationship',
      relationTo: 'directions',
      hasMany: true,
      required: true,
      minRows: 1,
      index: true,
    },
    {
      name: 'products',
      label: 'Использованные изделия',
      type: 'relationship',
      relationTo: 'products',
      hasMany: true,
      maxRows: 20,
    },
    { name: 'summary', label: 'Кратко (что сделали, объём)', type: 'textarea', required: true, maxLength: 400 },
    { name: 'description', label: 'Подробно', type: 'richText' },
    { name: 'cover', label: 'Обложка', type: 'upload', relationTo: 'media' },
    { name: 'gallery', label: 'Галерея', type: 'upload', relationTo: 'media', hasMany: true, maxRows: 30 },
    { name: 'featured', label: 'Показывать на главной', type: 'checkbox', defaultValue: false, admin: { position: 'sidebar' } },
  ],
}
