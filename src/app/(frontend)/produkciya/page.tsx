import type { Metadata } from 'next'
import { Download } from 'lucide-react'
import { getDirections, getSiteSettings } from '@/lib/queries'
import { buildMetadata } from '@/lib/seo'
import { fileUrl } from '@/lib/media'
import { Breadcrumbs } from '@/components/layout/breadcrumbs'
import { DirectionCard } from '@/components/catalog/cards'
import { Container, SectionTitle } from '@/components/ui/misc'
import { LeadButton } from '@/components/forms/lead-provider'
import { DownloadLink } from '@/components/blocks/download-link'

export async function generateMetadata(): Promise<Metadata> {
  const s = await getSiteSettings()
  return buildMetadata({
    title: `Продукция и услуги — ${s.companyName}`,
    description: 'Малые архитектурные формы, уличная мебель, противопожарные двери, фасады, тепловые узлы и шумозащитные кожухи от производителя.',
    path: '/produkciya',
  })
}

export default async function ProductionPage() {
  const [directions, settings] = await Promise.all([getDirections(), getSiteSettings()])
  const catalog = directions.filter((d) => d.type === 'catalog')
  const service = directions.filter((d) => d.type === 'service')
  const pdf = fileUrl(settings.catalogPdf)

  return (
    <>
      <Breadcrumbs items={[{ name: 'Продукция', path: '/produkciya' }]} />
      <Container className="py-8">
        <h1 className="font-display text-3xl font-bold md:text-4xl">Продукция и услуги</h1>
        {catalog.length ? (
          <section className="mt-8">
            <SectionTitle>Изделия</SectionTitle>
            <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {catalog.map((d) => (
                <DirectionCard key={d.id} d={d} />
              ))}
            </div>
          </section>
        ) : null}
        {service.length ? (
          <section className="mt-12">
            <SectionTitle>Работы под заказ</SectionTitle>
            <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {service.map((d) => (
                <DirectionCard key={d.id} d={d} />
              ))}
            </div>
          </section>
        ) : null}
        <section className="mt-12 flex flex-col items-start gap-4 rounded-[4px] border border-border bg-muted p-6 md:flex-row md:items-center md:justify-between">
          <p className="font-display text-xl font-bold">Нужна продукция по вашим чертежам? Изготовим.</p>
          <div className="flex flex-wrap gap-3">
            <LeadButton type="callback" label="Обсудить задачу" />
            {pdf ? (
              <DownloadLink href={pdf} goal="download_catalog" className="inline-flex min-h-11 items-center gap-2 rounded-[4px] border border-fg px-5 text-sm font-medium hover:bg-bg">
                <Download className="size-4" /> Скачать каталог PDF
              </DownloadLink>
            ) : null}
          </div>
        </section>
      </Container>
    </>
  )
}
