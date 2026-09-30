import type { Metadata } from 'next'
import { Clock, Mail, MapPin, MessageCircle, Phone, Send } from 'lucide-react'
import { getSiteSettings } from '@/lib/queries'
import { buildMetadata } from '@/lib/seo'
import { formatPhone, phoneHref } from '@/lib/format'
import { Breadcrumbs } from '@/components/layout/breadcrumbs'
import { RequisitesTable } from '@/components/blocks/blocks'
import { TrackedLink } from '@/components/blocks/download-link'
import { Container } from '@/components/ui/misc'
import { InlineLeadForm } from '@/components/forms/lead-provider'
import { buttonClass } from '@/components/ui/button'

export async function generateMetadata(): Promise<Metadata> {
  const s = await getSiteSettings()
  return buildMetadata({ title: `Контакты — ${s.companyName}`, description: 'Телефоны, email, адрес производства и форма обратной связи.', path: '/kontakty' })
}

export default async function ContactsPage() {
  const s = await getSiteSettings()
  const hasMap = typeof s.lat === 'number' && typeof s.lng === 'number'
  return (
    <>
      <Breadcrumbs items={[{ name: 'Контакты', path: '/kontakty' }]} />
      <Container className="py-8">
        <h1 className="font-display text-3xl font-bold md:text-4xl">Контакты</h1>
        <div className="mt-8 grid gap-10 lg:grid-cols-2">
          <div className="space-y-4">
            {(s.phones ?? []).map((p) => (
              <p key={p.id ?? p.number} className="flex items-center gap-3">
                <Phone className="size-5 shrink-0" />
                <TrackedLink href={phoneHref(p.number)} goal="click_phone" className="text-2xl font-bold">
                  {formatPhone(p.number)}
                </TrackedLink>
                {p.label ? <span className="text-sm text-muted-fg">{p.label}</span> : null}
              </p>
            ))}
            {(s.emails ?? []).map((e) => (
              <p key={e.id ?? e.email} className="flex items-center gap-3">
                <Mail className="size-5 shrink-0" />
                <TrackedLink href={`mailto:${e.email}`} goal="click_email" className="underline">
                  {e.email}
                </TrackedLink>
              </p>
            ))}
            <div className="flex flex-wrap gap-3">
              {s.telegramUrl ? (
                <TrackedLink href={s.telegramUrl} goal="click_telegram" className={buttonClass('secondary')}>
                  <Send className="size-4" /> Telegram
                </TrackedLink>
              ) : null}
              {s.whatsappUrl ? (
                <a href={s.whatsappUrl} target="_blank" rel="noopener noreferrer" className={buttonClass('secondary')}>
                  <MessageCircle className="size-4" /> WhatsApp
                </a>
              ) : null}
            </div>
            {s.workingHours ? (
              <p className="flex items-center gap-3">
                <Clock className="size-5 shrink-0" /> {s.workingHours}
              </p>
            ) : null}
            {s.productionAddress ? (
              <p className="flex items-start gap-3">
                <MapPin className="mt-0.5 size-5 shrink-0" /> {s.productionAddress}
              </p>
            ) : null}
            {s.responseTimePromise ? <p className="text-sm text-muted-fg">{s.responseTimePromise}</p> : null}
          </div>
          <div>
            <InlineLeadForm type="callback" />
          </div>
        </div>

        {hasMap ? (
          <section className="mt-12">
            <iframe
              title="Карта проезда"
              src={`https://yandex.ru/map-widget/v1/?ll=${s.lng},${s.lat}&z=15&pt=${s.lng},${s.lat},pm2rdm`}
              loading="lazy"
              className="h-[300px] w-full border-0 lg:h-[400px]"
            />
            <p className="mt-2 flex flex-wrap gap-4 text-sm">
              <a href={`https://yandex.ru/maps/?rtext=~${s.lat},${s.lng}`} target="_blank" rel="noopener noreferrer" className="underline">
                Построить маршрут
              </a>
              <a href={`https://yandex.ru/maps/?pt=${s.lng},${s.lat}&z=15&l=map`} target="_blank" rel="noopener noreferrer" className="underline">
                Открыть в Яндекс Картах
              </a>
            </p>
          </section>
        ) : null}
        <RequisitesTable settings={s} />
      </Container>
    </>
  )
}
