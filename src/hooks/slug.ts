import type { Field, FieldHook } from 'payload'

const MAP: Record<string, string> = {
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'e', ж: 'zh', з: 'z', и: 'i',
  й: 'j', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't',
  у: 'u', ф: 'f', х: 'h', ц: 'c', ч: 'ch', ш: 'sh', щ: 'shch', ъ: '', ы: 'y', ь: '',
  э: 'e', ю: 'yu', я: 'ya',
}

// «Скамейка „Урсула“ 2.0» → "skamejka-ursula-2-0"
export const slugify = (input: string): string =>
  input
    .toLowerCase()
    .split('')
    .map((ch) => MAP[ch] ?? ch)
    .join('')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)

// source — одно поле или несколько (для товара: название + артикул, чтобы slug не повторялся)
const formatSlug =
  (source: string | string[]): FieldHook =>
  ({ value, data }) => {
    if (typeof value === 'string' && value.trim() !== '') return slugify(value)
    const parts = [source].flat().map((k) => data?.[k]).filter((v): v is string => typeof v === 'string' && v !== '')
    return parts.length ? slugify(parts.join(' ')) : value
  }

export const slugField = (source: string | string[] = 'title'): Field => ({
  name: 'slug',
  label: 'Адрес страницы (slug)',
  type: 'text',
  required: true,
  unique: true,
  index: true,
  admin: {
    position: 'sidebar',
    description:
      'Заполняется автоматически из названия. Меняйте только при необходимости: старые ссылки перестанут работать.',
  },
  hooks: { beforeValidate: [formatSlug(source)] },
})
