import type { CollectionConfig } from 'payload'
import { anyone, isEditorOrAdmin } from '../access'
import { DOCUMENTS_TARGETS, revalidateCollection, revalidateOnDelete } from '../hooks/revalidate'

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

const dayOnly = { date: { pickerAppearance: 'dayOnly', displayFormat: 'dd.MM.yyyy' } } as const

export const Documents: CollectionConfig = {
  slug: 'documents',
  labels: { singular: 'Документ', plural: 'Документы' },
  defaultSort: 'order',
  admin: { group: 'Контент', useAsTitle: 'title', defaultColumns: ['title', 'docType', 'validUntil', 'showOnHome'] },
  access: { read: anyone, create: isEditorOrAdmin, update: isEditorOrAdmin, delete: isEditorOrAdmin },
  hooks: {
    afterChange: [revalidateCollection(DOCUMENTS_TARGETS)],
    afterDelete: [revalidateOnDelete(DOCUMENTS_TARGETS)],
  },
  fields: [
    { name: 'title', label: 'Название', type: 'text', required: true, maxLength: 150 },
    { name: 'docType', label: 'Тип', type: 'select', required: true, options: [...DOC_TYPES], index: true },
    { name: 'file', label: 'Файл', type: 'upload', relationTo: 'files', required: true },
    { name: 'preview', label: 'Превью (скан первой страницы)', type: 'upload', relationTo: 'media' },
    {
      type: 'row',
      fields: [
        { name: 'number', label: 'Номер', type: 'text', maxLength: 60 },
        { name: 'issuedAt', label: 'Дата выдачи', type: 'date', admin: dayOnly },
        { name: 'validUntil', label: 'Действует до', type: 'date', index: true, admin: dayOnly },
      ],
    },
    { name: 'directions', label: 'Относится к направлениям', type: 'relationship', relationTo: 'directions', hasMany: true },
    { name: 'showOnHome', label: 'Показывать на главной', type: 'checkbox', defaultValue: false },
    { name: 'order', label: 'Порядок', type: 'number', defaultValue: 100 },
  ],
}
