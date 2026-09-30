import type { CollectionConfig } from 'payload'
import { anyone, isEditorOrAdmin } from '../access'

// PDF и сканы документов
export const Files: CollectionConfig = {
  slug: 'files',
  labels: { singular: 'Файл', plural: 'Файлы' },
  admin: { group: 'Медиа', useAsTitle: 'title' },
  access: { read: anyone, create: isEditorOrAdmin, update: isEditorOrAdmin, delete: isEditorOrAdmin },
  upload: { staticDir: 'media/files', mimeTypes: ['application/pdf', 'image/jpeg', 'image/png'] },
  fields: [{ name: 'title', label: 'Название для скачивания', type: 'text', required: true, maxLength: 150 }],
}
