import 'server-only'
import type { Lead, Product, Direction } from '@/payload-types'
import { formatDateTime, formatPhone } from '../format'

const TYPE_LABEL: Record<string, string> = {
  callback: 'Обратный звонок',
  quote: 'Запрос КП',
  calculation: 'Запрос расчёта',
}

const site = () => process.env.NEXT_PUBLIC_SITE_URL ?? ''

export function leadSummary(lead: Lead) {
  const product = typeof lead.product === 'object' && lead.product ? (lead.product as Product) : null
  const direction = typeof lead.direction === 'object' && lead.direction ? (lead.direction as Direction) : null
  const org = lead.organization || lead.name
  return {
    subject: `Заявка №${lead.number} — ${TYPE_LABEL[lead.type] ?? lead.type} — ${org}`,
    typeLabel: TYPE_LABEL[lead.type] ?? lead.type,
    product,
    direction,
    adminUrl: `${site()}/admin/collections/leads/${lead.id}`,
    date: formatDateTime(lead.createdAt),
    phone: formatPhone(lead.phone),
  }
}
