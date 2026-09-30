import Link from 'next/link'
import { Mail, MapPin, Phone, Send } from 'lucide-react'
import type { Direction, SiteSetting } from '@/payload-types'
import { formatPhone, phoneHref } from '@/lib/format'
import { hasRequisites, NAV_ABOUT } from '@/lib/site'
import { Container } from '@/components/ui/misc'

export function Footer({ settings, directions }: { settings: SiteSetting; directions: Direction[] }) {
  const year = new Date().getFullYear()
  return (
    <footer className="mt-20 bg-inverse-bg text-inverse-fg">
      <Container className="grid gap-10 py-12 md:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-3 text-sm">
          <p className="font-display text-xl font-bold">{settings.companyName}</p>
          {settings.tagline ? <p className="text-white/70">{settings.tagline}</p> : null}
          {(settings.phones ?? []).map((p) => (
            <p key={p.id ?? p.number} className="flex items-center gap-2">
              <Phone className="size-4 shrink-0" />
              <a href={phoneHref(p.number)}>{formatPhone(p.number)}</a>
              {p.label ? <span className="text-white/60">{p.label}</span> : null}
            </p>
          ))}
          {(settings.emails ?? []).map((e) => (
            <p key={e.id ?? e.email} className="flex items-center gap-2">
              <Mail className="size-4 shrink-0" />
              <a href={`mailto:${e.email}`}>{e.email}</a>
            </p>
          ))}
          {settings.telegramUrl ? (
            <p className="flex items-center gap-2">
              <Send className="size-4 shrink-0" />
              <a href={settings.telegramUrl} target="_blank" rel="noopener noreferrer">
                Telegram
              </a>
            </p>
          ) : null}
          {settings.workingHours ? <p className="text-white/70">{settings.workingHours}</p> : null}
        </div>

        <details className="text-sm md:open:block lg:block" open>
          <summary className="mb-3 cursor-pointer font-bold lg:cursor-default">Продукция</summary>
          <ul className="space-y-2">
            {directions.map((d) => (
              <li key={d.id}>
                <Link href={`/produkciya/${d.slug}`} className="text-white/80 hover:text-white">
                  {d.title}
                </Link>
              </li>
            ))}
          </ul>
        </details>

        <details className="text-sm" open>
          <summary className="mb-3 cursor-pointer font-bold lg:cursor-default">Компания</summary>
          <ul className="space-y-2">
            <li>
              <Link href="/obekty" className="text-white/80 hover:text-white">
                Объекты
              </Link>
            </li>
            {NAV_ABOUT.map((a) => (
              <li key={a.href}>
                <Link href={a.href} className="text-white/80 hover:text-white">
                  {a.label}
                </Link>
              </li>
            ))}
            <li>
              <Link href="/goszakazchikam" className="text-white/80 hover:text-white">
                Госзаказчикам
              </Link>
            </li>
            <li>
              <Link href="/kontakty" className="text-white/80 hover:text-white">
                Контакты
              </Link>
            </li>
          </ul>
        </details>

        {hasRequisites(settings) || settings.productionAddress ? (
          <div className="space-y-2 text-sm">
            <p className="font-bold">Реквизиты</p>
            {settings.legalName ? <p>{settings.legalName}</p> : null}
            {settings.inn ? <p>ИНН {settings.inn}</p> : null}
            {settings.kpp ? <p>КПП {settings.kpp}</p> : null}
            {settings.ogrn ? <p>ОГРН {settings.ogrn}</p> : null}
            {settings.legalAddress ? <p className="text-white/70">Юр. адрес: {settings.legalAddress}</p> : null}
            {settings.productionAddress ? (
              <p className="flex items-start gap-2 text-white/70">
                <MapPin className="mt-0.5 size-4 shrink-0" />
                Производство: {settings.productionAddress}
              </p>
            ) : null}
          </div>
        ) : null}
      </Container>
      <div className="border-t border-white/15">
        <Container className="flex flex-col gap-2 py-4 text-xs text-white/70 md:flex-row md:justify-between">
          <p>
            © {year} {settings.legalName || settings.companyName}
          </p>
          <p className="flex flex-wrap gap-x-4 gap-y-1">
            <Link href="/politika-konfidencialnosti">Политика обработки ПДн</Link>
            <Link href="/soglasie-na-obrabotku">Согласие на обработку ПДн</Link>
            <Link href="/cookie">Cookie</Link>
          </p>
        </Container>
      </div>
    </footer>
  )
}
