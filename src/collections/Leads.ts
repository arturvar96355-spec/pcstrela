import type { CollectionConfig, Field } from 'payload'
import { isAdmin, isEditorOrAdmin, nobody } from '../access'

const ro = (f: Field): Field =>
  ({ ...f, admin: { ...(f as { admin?: object }).admin, readOnly: true } }) as Field

const NOTIFY_OPTIONS = [
  { label: 'Ожидает', value: 'pending' },
  { label: 'Отправлено', value: 'sent' },
  { label: 'Ошибка', value: 'failed' },
  { label: 'Канал выключен', value: 'skipped' },
]

export const Leads: CollectionConfig = {
  slug: 'leads',
  labels: { singular: 'Заявка', plural: 'Заявки' },
  defaultSort: '-createdAt',
  admin: {
    group: 'Заявки',
    useAsTitle: 'name',
    defaultColumns: ['number', 'createdAt', 'type', 'name', 'organization', 'phone', 'status'],
    listSearchableFields: ['name', 'phone', 'email', 'organization'],
  },
  access: {
    create: nobody, // создаются только в /api/public/leads через Local API с overrideAccess: true
    read: isEditorOrAdmin,
    update: isEditorOrAdmin, // фактически меняются только status и managerComment (остальные поля readOnly)
    delete: isAdmin,
  },
  fields: [
    ro({ name: 'number', label: '№', type: 'number', required: true, unique: true, index: true }),
    ro({
      name: 'type',
      label: 'Тип',
      type: 'select',
      required: true,
      options: [
        { label: 'Обратный звонок', value: 'callback' },
        { label: 'Запрос КП', value: 'quote' },
        { label: 'Запрос расчёта', value: 'calculation' },
      ],
    }),
    {
      name: 'status',
      label: 'Статус',
      type: 'select',
      required: true,
      defaultValue: 'new',
      index: true,
      admin: { position: 'sidebar' },
      options: [
        { label: 'Новая', value: 'new' },
        { label: 'В работе', value: 'in_progress' },
        { label: 'Обработана', value: 'done' },
        { label: 'Спам', value: 'spam' },
      ],
    },
    {
      name: 'managerComment',
      label: 'Комментарий менеджера',
      type: 'textarea',
      maxLength: 2000,
      admin: { position: 'sidebar' },
    },
    ro({ name: 'name', label: 'Имя', type: 'text', required: true }),
    ro({ name: 'phone', label: 'Телефон', type: 'text', required: true, index: true }),
    ro({ name: 'email', label: 'Email', type: 'email' }),
    ro({ name: 'organization', label: 'Организация', type: 'text' }),
    ro({ name: 'inn', label: 'ИНН', type: 'text' }),
    ro({ name: 'region', label: 'Регион поставки', type: 'text' }),
    ro({ name: 'product', label: 'Изделие', type: 'relationship', relationTo: 'products' }),
    ro({ name: 'direction', label: 'Направление', type: 'relationship', relationTo: 'directions' }),
    ro({ name: 'quantity', label: 'Количество', type: 'number' }),
    ro({ name: 'message', label: 'Сообщение', type: 'textarea' }),
    ro({ name: 'sourceUrl', label: 'Страница отправки', type: 'text' }),
    ro({ name: 'utm', label: 'UTM-метки', type: 'json' }),
    ro({ name: 'consentAt', label: 'Согласие на обработку ПДн получено', type: 'date', required: true }),
    ro({ name: 'consentVersion', label: 'Версия текста согласия', type: 'text', required: true }),
    ro({ name: 'ip', label: 'IP', type: 'text' }),
    ro({ name: 'userAgent', label: 'Браузер', type: 'text' }),
    ro({ name: 'dedupeKey', label: 'Ключ дедупликации', type: 'text', index: true, admin: { hidden: true } }),
    {
      name: 'notifications',
      label: 'Доставка уведомлений',
      type: 'group',
      admin: { readOnly: true },
      fields: [
        { name: 'email', type: 'select', defaultValue: 'pending', options: NOTIFY_OPTIONS, index: true },
        { name: 'telegram', type: 'select', defaultValue: 'pending', options: NOTIFY_OPTIONS, index: true },
        { name: 'attempts', type: 'number', defaultValue: 0 },
        { name: 'lastError', type: 'text' },
      ],
    },
  ],
}
