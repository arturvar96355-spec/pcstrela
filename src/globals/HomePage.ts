import type { GlobalConfig } from 'payload'
import { anyone, isEditorOrAdmin } from '../access'
import { revalidateGlobal } from '../hooks/revalidate'

export const HomePage: GlobalConfig = {
  slug: 'home-page',
  label: 'Главная страница',
  admin: { group: 'Контент' },
  access: { read: anyone, update: isEditorOrAdmin },
  hooks: { afterChange: [revalidateGlobal([['/', 'page']])] },
  fields: [
    { name: 'heroTitle', label: 'Заголовок', type: 'text', required: true, maxLength: 90 },
    { name: 'heroSubtitle', label: 'Подзаголовок', type: 'textarea', required: true, maxLength: 220 },
    { name: 'heroImage', label: 'Фото первого экрана', type: 'upload', relationTo: 'media' },
    {
      name: 'audiences',
      label: 'Для кого (3 карточки)',
      type: 'array',
      maxRows: 3,
      fields: [
        { name: 'title', type: 'text', required: true, maxLength: 40 },
        { name: 'text', type: 'textarea', required: true, maxLength: 200 },
        {
          name: 'href',
          type: 'text',
          required: true,
          admin: { description: 'Внутренний путь, например /goszakazchikam' },
        },
      ],
    },
    { name: 'productionText', label: 'Текст блока «Производство»', type: 'textarea', maxLength: 500 },
    {
      name: 'productionImages',
      label: 'Фото блока «Производство»',
      type: 'upload',
      relationTo: 'media',
      hasMany: true,
      maxRows: 4,
    },
    {
      name: 'steps',
      label: 'Как работаем',
      type: 'array',
      maxRows: 6,
      fields: [
        { name: 'title', type: 'text', required: true, maxLength: 40 },
        { name: 'text', type: 'textarea', maxLength: 160 },
      ],
    },
  ],
}
