import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import './globals.css'
import { getDirections, getPage, getSiteSettings } from '@/lib/queries'
import { primaryPhone } from '@/lib/site'
import { SITE_URL, absoluteUrl } from '@/lib/seo'
import { imageOf } from '@/lib/media'
import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'
import { CookieBanner } from '@/components/layout/cookie-banner'
import { Metrika } from '@/components/layout/metrika'
import { JsonLd } from '@/components/layout/json-ld'
import { ScrollEffects } from '@/components/layout/scroll-effects'
import { LeadProvider } from '@/components/forms/lead-provider'

// Данные берутся из БД на каждый запрос: сайт не требует доступа к БД при сборке.
export const dynamic = 'force-dynamic'

export async function generateMetadata(): Promise<Metadata> {
  const s = await getSiteSettings()
  return {
    metadataBase: new URL(SITE_URL),
    title: { default: s.companyName, template: `%s` },
    ...(s.yandexVerification ? { verification: { yandex: s.yandexVerification } } : {}),
  }
}

export default async function FrontendLayout({ children }: { children: ReactNode }) {
  const [settings, directions, consentPage] = await Promise.all([getSiteSettings(), getDirections(), getPage('soglasie-na-obrabotku')])
  const phone = primaryPhone(settings)
  const logo = imageOf(settings.logo, 'card')

  const organization = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: settings.companyName,
    ...(settings.legalName ? { legalName: settings.legalName } : {}),
    url: SITE_URL,
    ...(logo ? { logo: absoluteUrl(logo.url) } : {}),
    ...(phone ? { telephone: phone.href.replace('tel:', '') } : {}),
    ...(settings.emails?.[0] ? { email: settings.emails[0].email } : {}),
    ...(settings.legalAddress ? { address: { '@type': 'PostalAddress', streetAddress: settings.legalAddress, addressCountry: 'RU' } } : {}),
    ...(settings.inn ? { taxID: settings.inn } : {}),
  }

  return (
    <html lang="ru">
      <body className="min-h-screen bg-bg text-fg antialiased">
        <LeadProvider
          config={{
            consentVersion: consentPage?.version || '1',
            promise: settings.responseTimePromise || 'Ответим в рабочее время в течение 1 часа',
            phone: phone?.display ?? '',
            directions: directions.map((d) => ({ id: d.id, title: d.title })),
          }}
        >
          <ScrollEffects />
          <Header settings={settings} directions={directions} />
          <main className="page-enter">{children}</main>
          <Footer settings={settings} directions={directions} />
          <CookieBanner />
          <Metrika id={settings.metrikaId} />
        </LeadProvider>
        <JsonLd data={organization} />
      </body>
    </html>
  )
}
