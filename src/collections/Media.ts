import type { CollectionConfig } from 'payload'
import { anyone, isEditorOrAdmin } from '../access'

// Общие изображения: обложки, объекты, производство
export const Media: CollectionConfig = {
  slug: 'media',
  labels: { singular: 'Изображение', plural: 'Изображения' },
  admin: { group: 'Медиа', useAsTitle: 'alt' },
  access: { read: anyone, create: isEditorOrAdmin, update: isEditorOrAdmin, delete: isEditorOrAdmin },
  upload: {
    staticDir: 'media/general',
    mimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
    resizeOptions: { width: 2560, withoutEnlargement: true },
    formatOptions: { format: 'webp', options: { quality: 82 } },
    imageSizes: [
      { name: 'thumb', width: 480, formatOptions: { format: 'webp', options: { quality: 78 } } },
      { name: 'card', width: 960, formatOptions: { format: 'webp', options: { quality: 80 } } },
      { name: 'hero', width: 1920, formatOptions: { format: 'webp', options: { quality: 82 } } },
    ],
    adminThumbnail: 'thumb',
  },
  fields: [
    {
      name: 'alt',
      label: 'Описание изображения (для незрячих и поисковиков)',
      type: 'text',
      required: true,
      maxLength: 200,
    },
  ],
}
