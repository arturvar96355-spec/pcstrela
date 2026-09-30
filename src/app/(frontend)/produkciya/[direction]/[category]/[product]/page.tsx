import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound, permanentRedirect } from 'next/navigation'
import { BadgeCheck, CalendarClock, Phone, Ruler, ShieldCheck, Weight } from 'lucide-react'
import { getProductBySlugs, getProjectsByProduct, getSimilarProducts, getSiteSettings } from '@/lib/queries'
import { absoluteUrl, buildMetadata } from '@/lib/seo'
import { imageOf } from '@/lib/media'
import { formatDimensions, formatProductionTime, formatWarranty, formatWeight } from '@/lib/format'
import { primaryPhone } from '@/lib/site'
import { Breadcrumbs } from '@/components/layout/breadcrumbs'
import { JsonLd } from '@/components/layout/json-ld'
import { RichText, hasRichText } from '@/components/layout/rich-text'
import { ProductCard } from '@/components/catalog/cards'
import { ProductGallery } from '@/components/catalog/product-gallery'
import { SpecTable, buildSpecRows } from '@/components/catalog/spec-table'
import { ProjectsBlock } from '@/components/blocks/blocks'
import { TrackedLink } from '@/components/blocks/download-link'
import { Badge, Container, SectionTitle } from '@/components/ui/misc'
import { LeadButton, PageLeadContext } from '@/components/forms/lead-provider'
import { buttonClass } from '@/components/ui/button'

type Params = { direction: string; category: string; product: string }

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { direction, category, product } = await params
  const found = await getProductBySlugs(direction, category, product)
  if (!found) return {}
  const { product: p, direction: d, category: c } = found
  const dims = formatDimensions(p.lengthMm, p.widthMm, p.heightMm)
  const mats = (p.materials ?? []).map((m) => m.material).join(', ')
  const time = formatProductionTime(p.productionDaysMin, p.productionDaysMax)
  const meta = (p as { meta?: { title?: string | null; description?: string | null } }).meta
  return buildMetadata({
    title: `${p.title} ${p.sku} — ${c.title}`,
    description:
      p.shortDescription ||
      `${p.title}${dims ? `, ${dims}` : ''}${mats ? `, ${mats}` : ''}.${time ? ` Срок изготовления ${time}.` : ''} Запросите КП.`,
    path: `/produkciya/${d.slug}/${c.slug}/${p.slug}`,
    image: imageOf(p.gallery?.[0], 'card')?.url,
    metaTitle: meta?.title,
    metaDescription: meta?.description,
  })
}

export default async function ProductPage({ params }: { params: Promise<Params> }) {
  const { direction, category, product } = await params
  const found = await getProductBySlugs(direction, category, product)
  if (!found) notFound()
  const { product: p, direction: d, category: c, exact } = found
  const url = `/produkciya/${d.slug}/${c.slug}/${p.slug}`
  if (!exact) permanentRedirect(url)

  const [settings, projects, similar] = await Promise.all([getSiteSettings(), getProjectsByProduct(p.id, 4), getSimilarProducts(p, 4)])
  const phone = primaryPhone(settings)

  const photos = (p.gallery ?? [])
    .map((g) => {
      const small = imageOf(g, 'thumb')
      const big = imageOf(g, 'hero')
      return small && big ? { url: small.url, full: big.url, alt: big.alt || p.title } : null
    })
    .filter((x): x is NonNullable<typeof x> => Boolean(x))
  const dr = imageOf(p.drawing, 'hero')
  const drawing = dr ? { url: dr.url, full: dr.url, alt: dr.alt || `Чертёж ${p.title}` } : null

  const dims = formatDimensions(p.lengthMm, p.widthMm, p.heightMm)
  const weight = formatWeight(p.weightKg)
  const time = formatProductionTime(p.productionDaysMin, p.productionDaysMax)
  const warranty = formatWarranty(p.warrantyMonths)
  const rows = buildSpecRows(p)
  const leadProduct = { id: p.id, title: p.title, sku: p.sku }

  const ld = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: p.title,
    sku: p.sku,
    ...(photos[0] ? { image: [absoluteUrl(photos[0].full)] } : {}),
    ...(p.shortDescription ? { description: p.shortDescription } : {}),
    brand: { '@type': 'Brand', name: settings.companyName },
  }

  return (
    <>
      <PageLeadContext type="quote" product={leadProduct} />
      <Breadcrumbs
        items={[
          { name: 'Продукция', path: '/produkciya' },
          { name: d.title, path: `/produkciya/${d.slug}` },
          { name: c.title, path: `/produkciya/${d.slug}/${c.slug}` },
          { name: p.title, path: url },
        ]}
      />
      <Container className="py-6">
        <Link href={`/produkciya/${d.slug}/${c.slug}`} className="text-sm text-muted-fg hover:text-fg">
          ← назад в «{c.title}»
        </Link>

        <div className="mt-4 grid gap-8 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <ProductGallery photos={photos} drawing={drawing} />
          </div>
          <div className="lg:col-span-5">
            <Badge mono>{p.sku}</Badge>
            <h1 className="mt-3 font-display text-3xl font-bold">{p.title}</h1>
            {p.shortDescription ? <p className="mt-3 text-muted-fg">{p.shortDescription}</p> : null}

            <ul className="mt-5 space-y-2 text-sm">
              {dims ? (
                <li className="flex items-center gap-2">
                  <Ruler className="size-4" /> {dims}
                </li>
              ) : null}
              {weight ? (
                <li className="flex items-center gap-2">
                  <Weight className="size-4" /> {weight}
                </li>
              ) : null}
              {time ? (
                <li className="flex items-center gap-2">
                  <CalendarClock className="size-4" /> Срок изготовления: {time}
                </li>
              ) : null}
              {warranty ? (
                <li className="flex items-center gap-2">
                  <ShieldCheck className="size-4" /> Гарантия: {warranty}
                </li>
              ) : null}
            </ul>

            {p.inGispRegistry ? (
              <p className="mt-4 flex items-start gap-2 rounded-[4px] border border-border bg-muted p-3 text-sm">
                <BadgeCheck className="mt-0.5 size-5 shrink-0" />
                <span>
                  В реестре российской промышленной продукции{p.gispRegistryNumber ? `, запись № ${p.gispRegistryNumber}` : ''}
                </span>
              </p>
            ) : null}

            <div id="product-cta" className="mt-6 flex flex-wrap gap-3">
              <LeadButton type="quote" product={leadProduct} label="Запросить КП" className="flex-1" />
              {phone ? (
                <TrackedLink href={phone.href} goal="click_phone" className={buttonClass('secondary', 'flex-1')}>
                  <Phone className="size-4" /> Позвонить
                </TrackedLink>
              ) : null}
            </div>
            {settings.responseTimePromise ? <p className="mt-3 text-sm text-muted-fg">{settings.responseTimePromise}</p> : null}
          </div>
        </div>

        <section className="mt-12 max-w-3xl">
          <SectionTitle>Характеристики</SectionTitle>
          <div className="mt-4">
            <SpecTable rows={rows} />
          </div>
        </section>

        {hasRichText(p.description) ? (
          <section className="mt-12 max-w-3xl">
            <SectionTitle>Описание</SectionTitle>
            <RichText data={p.description} className="mt-4" />
          </section>
        ) : null}

        <ProjectsBlock projects={projects} title="Установлено на объектах" all={false} />

        {similar.length ? (
          <section className="mt-14">
            <SectionTitle>Похожие модели</SectionTitle>
            <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {similar.map((s) => {
                const dd = typeof s.direction === 'string' ? d.slug : s.direction.slug
                const cc = typeof s.category === 'string' ? c.slug : s.category.slug
                return <ProductCard key={s.id} p={s} href={`/produkciya/${dd}/${cc}/${s.slug}`} />
              })}
            </div>
          </section>
        ) : null}
      </Container>

      {/* липкая панель на мобильном */}
      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-bg p-3 shadow-[0_-2px_12px_rgba(0,0,0,0.12)] lg:hidden">
        <LeadButton type="quote" product={leadProduct} label="Запросить КП" className="w-full" />
      </div>
      <JsonLd data={ld} />
    </>
  )
}
