import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import { getCategoryBySlugs, getProducts } from '@/lib/queries'
import { buildMetadata, absoluteUrl, jsonLd } from '@/lib/seo'
import { imageOf } from '@/lib/media'
import { pluralize } from '@/lib/format'
import { Breadcrumbs } from '@/components/layout/breadcrumbs'
import { RichText, hasRichText } from '@/components/layout/rich-text'
import { ProductCard } from '@/components/catalog/cards'
import { Pagination } from '@/components/catalog/pagination'
import { Container, EmptyState } from '@/components/ui/misc'
import { LeadButton } from '@/components/forms/lead-provider'

type Params = { direction: string; category: string }
type Search = { page?: string }

const pageNum = (v?: string) => {
  const n = Number(v)
  return Number.isInteger(n) && n >= 1 ? n : 1
}

export async function generateMetadata({ params, searchParams }: { params: Promise<Params>; searchParams: Promise<Search> }): Promise<Metadata> {
  const { direction, category } = await params
  const { page } = await searchParams
  const found = await getCategoryBySlugs(direction, category)
  if (!found) return {}
  const { category: c, direction: d } = found
  const { totalDocs } = await getProducts({ categoryId: c.id, page: pageNum(page) })
  const meta = (c as { meta?: { title?: string | null; description?: string | null } }).meta
  return buildMetadata({
    title: `${c.title} для благоустройства — купить от производителя`,
    description: c.shortDescription || `${c.title}: ${totalDocs} ${pluralize(totalDocs, 'модель', 'модели', 'моделей')}. Цена по запросу, собственное производство, доставка по России.`,
    path: `/produkciya/${d.slug}/${c.slug}`,
    page: pageNum(page),
    image: imageOf(c.cover, 'card')?.url,
    metaTitle: meta?.title,
    metaDescription: meta?.description,
  })
}

export default async function CategoryPage({ params, searchParams }: { params: Promise<Params>; searchParams: Promise<Search> }) {
  const { direction, category } = await params
  const sp = await searchParams
  const found = await getCategoryBySlugs(direction, category)
  if (!found) notFound()
  const { direction: d, category: c } = found
  const base = `/produkciya/${d.slug}/${c.slug}`

  const requested = sp.page === undefined ? 1 : Number(sp.page)
  if (sp.page !== undefined && (!Number.isInteger(requested) || requested < 1)) redirect(`${base}?page=1`)
  const res = await getProducts({ categoryId: c.id, page: requested })
  if (requested > 1 && requested > res.totalPages) redirect(`${base}?page=1`)

  const itemList = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    itemListElement: res.docs.map((p, i) => ({ '@type': 'ListItem', position: i + 1, url: absoluteUrl(`${base}/${p.slug}`), name: p.title })),
  }

  return (
    <>
      <Breadcrumbs
        items={[
          { name: 'Продукция', path: '/produkciya' },
          { name: d.title, path: `/produkciya/${d.slug}` },
          { name: c.title, path: base },
        ]}
      />
      <Container className="py-8">
        <h1 className="page-title font-display text-3xl font-bold md:text-5xl">{c.title}</h1>
        {c.shortDescription ? <p className="mt-3 max-w-3xl text-muted-fg">{c.shortDescription}</p> : null}
        <p className="mt-2 text-sm text-muted-fg">
          {res.totalDocs} {pluralize(res.totalDocs, 'модель', 'модели', 'моделей')}
        </p>

        {res.docs.length ? (
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {res.docs.map((p) => (
              <ProductCard key={p.id} p={p} href={`${base}/${p.slug}`} />
            ))}
          </div>
        ) : (
          <div className="mt-8">
            <EmptyState
              action={<LeadButton type="quote" message={`Прошу прислать перечень изделий категории ${c.title}`} label="Запросить каталог" />}
            >
              В этой категории пока нет опубликованных моделей.
            </EmptyState>
          </div>
        )}

        <Pagination page={res.page} totalPages={res.totalPages} basePath={base} />
        {hasRichText(c.description) ? <RichText data={c.description} className="mt-14 max-w-3xl" /> : null}
      </Container>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(itemList) }} />
    </>
  )
}
