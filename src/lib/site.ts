import type { SiteSetting } from '@/payload-types'
import { formatPhone, phoneHref } from './format'

export function primaryPhone(s: SiteSetting): { display: string; href: string } | null {
  const phones = s.phones ?? []
  const p = phones.find((x) => x.primary) ?? phones[0]
  return p ? { display: formatPhone(p.number), href: phoneHref(p.number) } : null
}

export function hasRequisites(s: SiteSetting): boolean {
  return Boolean(s.legalName || s.inn)
}

export const NAV_ABOUT = [
  { href: '/o-kompanii', label: 'О компании' },
  { href: '/proizvodstvo', label: 'Производство' },
  { href: '/dokumenty', label: 'Документы' },
]
