const NBSP = ' '

// 1500 × 450 × 450 мм (неразрывные пробелы)
export function formatDimensions(l?: number | null, w?: number | null, h?: number | null): string | null {
  const parts = [l, w, h].filter((n): n is number => typeof n === 'number')
  if (parts.length === 0) return null
  return `${parts.join(`${NBSP}×${NBSP}`)}${NBSP}мм`
}

export function formatWeight(kg?: number | null): string | null {
  return typeof kg === 'number' ? `${String(kg).replace('.', ',')}${NBSP}кг` : null
}

export function formatProductionTime(min?: number | null, max?: number | null): string | null {
  if (!min && !max) return null
  if (min && max && min !== max) return `${min}–${max}${NBSP}рабочих${NBSP}дней`
  const n = (min ?? max) as number
  return `${n}${NBSP}${pluralize(n, 'рабочий день', 'рабочих дня', 'рабочих дней')}`
}

export function formatWarranty(months?: number | null): string | null {
  if (!months) return null
  return `${months}${NBSP}${pluralize(months, 'месяц', 'месяца', 'месяцев')}`
}

export function pluralize(n: number, one: string, few: string, many: string): string {
  const m10 = n % 10
  const m100 = n % 100
  if (m10 === 1 && m100 !== 11) return one
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few
  return many
}

// +79859750350 → +7 985 975-03-50
export function formatPhone(raw: string): string {
  const d = raw.replace(/\D/g, '')
  if (d.length !== 11) return raw
  return `+7 ${d.slice(1, 4)} ${d.slice(4, 7)}-${d.slice(7, 9)}-${d.slice(9, 11)}`
}

export function phoneHref(raw: string): string {
  return `tel:+${raw.replace(/\D/g, '').replace(/^8/, '7')}`
}

const MSK = 'Europe/Moscow'

export function formatDate(iso?: string | null): string | null {
  if (!iso) return null
  return new Intl.DateTimeFormat('ru-RU', { timeZone: MSK, day: '2-digit', month: '2-digit', year: 'numeric' }).format(
    new Date(iso),
  )
}

export function formatDateTime(iso: string): string {
  return new Intl.DateTimeFormat('ru-RU', {
    timeZone: MSK,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
    .format(new Date(iso))
    .replace(',', '')
}

// Начало текущих суток по Москве как ISO (для сравнения с validUntil)
export function startOfTodayMoscowISO(): string {
  const ymd = new Intl.DateTimeFormat('sv-SE', { timeZone: MSK }).format(new Date())
  return new Date(`${ymd}T00:00:00+03:00`).toISOString()
}

export function truncateWords(text: string, max = 160): string {
  if (text.length <= max) return text
  const cut = text.slice(0, max - 1)
  const lastSpace = cut.lastIndexOf(' ')
  return `${(lastSpace > 80 ? cut.slice(0, lastSpace) : cut).replace(/[\s,.;:—-]+$/, '')}…`
}

export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ')
}
