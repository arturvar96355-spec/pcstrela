import type { Metadata } from 'next'
import Image from 'next/image'
import { notFound } from 'next/navigation'
import { BadgeCheck, MapPin } from 'lucide-react'
import { PAGE_SLUGS } from '@/collections/Pages'
import { getDirections, getDocuments, getPage, getSiteSettings } from '@/lib/queries'
import { buildMetadata } from '@/lib/seo'
import { imageOf } from '@/lib/media'
import { Breadcrumbs } from '@/components/layout/breadcrumbs'
import { RichText, hasRichText } from '@/components/layout/rich-text'
import { DocumentCard, Facts, RequisitesTable } from '@/components/blocks/blocks'
import { Container, SectionTitle } from '@/components/ui/misc'
import { LeadButton } from '@/components/forms/lead-provider'
import { LinkButton } from '@/components/ui/button'

type Params = { slug: string }

const LEGAL = new Set(['politika-konfidencialnosti', 'soglasie-na-obrabotku', 'cookie'])
const GOV_DOC_TYPES = ['registry', 'certificate', 'declaration', 'sro', 'license']

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { slug } = await params
  const [page, s] = await Promise.all([getPage(slug), getSiteSettings()])
  if (!page) return {}
  const meta = (page as { meta?: { title?: string | null; description?: string | null } }).meta
  return buildMetadata({
    title: `${page.title} — ${s.companyName}`,
    description: page.lead,
    path: `/${page.slug}`,
    image: imageOf(page.cover, 'card')?.url,
    metaTitle: meta?.title,
    metaDescription: meta?.description,
  })
}

export default async function ContentPage({ params }: { params: Promise<Params> }) {
  const { slug } = await params
  if (!PAGE_SLUGS.some((p) => p.value === slug)) notFound()
  const page = await getPage(slug)
  if (!page) notFound()

  const settings = await getSiteSettings()
  const cover = imageOf(page.cover, 'hero')
  const gallery = (page.gallery ?? []).map((g) => imageOf(g, 'card')).filter((g): g is NonNullable<typeof g> => Boolean(g))
  const filled = hasRichText(page.content)
  // пустые страницы не показываем: на сайте не должно быть заглушек «скоро будет заполнено»
  if (!filled && !page.lead && !(page.gallery ?? []).length) notFound()

  // дополнения для госзаказчиков
  const gov = slug === 'goszakazchikam'
  const [directions, docs] = gov
    ? await Promise.all([getDirections(), getDocuments({ types: GOV_DOC_TYPES, limit: 6 })])
    : [[], []]
  const okpd = directions.filter((d) => d.okpd2)

  return (
    <>
      <Breadcrumbs items={[{ name: page.title, path: `/${page.slug}` }]} />
      <Container className="py-8">
        <div className="max-w-3xl">
          <h1 className="page-title font-display text-3xl font-bold md:text-5xl">{page.title}</h1>
          {page.lead ? <p className="mt-4 text-lg text-muted-fg">{page.lead}</p> : null}
          {slug === 'garantiya' && settings.warrantyShort ? (
            <p className="mt-6 rounded-[4px] border border-border bg-muted p-4 font-medium">{settings.warrantyShort}</p>
          ) : null}
          {cover ? (
            <div className="relative mt-6 aspect-[16/10] overflow-hidden rounded-[4px] bg-muted">
              <Image src={cover.url} alt={cover.alt} fill priority sizes="768px" className="object-cover" />
            </div>
          ) : null}
          {filled ? (
            <RichText data={page.content} className="mt-6" />
          ) : (
            <p className="mt-6 text-muted-fg">Раздел скоро будет заполнен. Пока вы можете связаться с нами: страница «Контакты».</p>
          )}
          {LEGAL.has(slug) && page.version ? <p className="mt-8 text-sm text-muted-fg">Версия от {page.version}</p> : null}
        </div>

        {slug === 'o-kompanii' ? <Facts settings={settings} /> : null}

        {gallery.length ? (
          <section className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {gallery.map((g) => (
              <div key={g.url} className="relative aspect-[4/3] overflow-hidden rounded-[4px] bg-muted">
                <Image src={g.url} alt={g.alt} fill sizes="(min-width:1024px) 33vw, 50vw" className="object-cover" />
              </div>
            ))}
          </section>
        ) : null}

        {slug === 'proizvodstvo' ? (
          <section className="mt-12 rounded-[4px] border border-border bg-muted p-6">
            <SectionTitle>Приезжайте на производство</SectionTitle>
            {settings.productionAddress ? (
              <p className="mt-3 flex items-start gap-2">
                <MapPin className="mt-0.5 size-5 shrink-0" /> {settings.productionAddress}
              </p>
            ) : null}
            <div className="mt-4 flex gap-3">
              <LeadButton type="callback" label="Договориться о визите" message="Хочу посетить производство" />
              <LinkButton href="/kontakty" variant="secondary">
                Контакты и карта
              </LinkButton>
            </div>
          </section>
        ) : null}

        {gov ? (
          <>
            {okpd.length ? (
              <section className="mt-12">
                <SectionTitle>ОКПД2 по направлениям</SectionTitle>
                <table className="mt-4 w-full max-w-3xl border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-fg text-left">
                      <th className="py-2 pr-4 font-medium">Направление</th>
                      <th className="py-2 font-medium">ОКПД2</th>
                    </tr>
                  </thead>
                  <tbody>
                    {okpd.map((d) => (
                      <tr key={d.id} className="border-b border-border">
                        <td className="py-3 pr-4">{d.title}</td>
                        <td className="py-3 font-mono">{d.okpd2}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </section>
            ) : null}
            {settings.gispNote ? (
              <p className="mt-6 flex max-w-3xl items-start gap-2 rounded-[4px] border border-border bg-muted p-3 text-sm">
                <BadgeCheck className="mt-0.5 size-5 shrink-0" /> {settings.gispNote}
              </p>
            ) : null}
            <section className="mt-12">
              <SectionTitle>Документы</SectionTitle>
              {docs.length ? (
                <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
                  {docs.map((d) => (
                    <DocumentCard key={d.id} d={d} />
                  ))}
                </div>
              ) : (
                <p className="mt-4 text-muted-fg">Документы предоставим по запросу.</p>
              )}
            </section>
            <RequisitesTable settings={settings} />
            <div className="mt-10">
              <LeadButton type="quote" label="Запросить КП" />
            </div>
          </>
        ) : null}
      </Container>
    </>
  )
}
