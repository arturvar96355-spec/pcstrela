import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { CheckCircle2, Factory } from 'lucide-react'
import { getCategoriesByDirection, getDirectionBySlug, getDocuments, getProducts, getProjectsByDirection, getSiteSettings } from '@/lib/queries'
import { buildMetadata } from '@/lib/seo'
import { imageOf } from '@/lib/media'
import { Breadcrumbs } from '@/components/layout/breadcrumbs'
import { RichText, hasRichText } from '@/components/layout/rich-text'
import { CategoryCard, ImageBox } from '@/components/catalog/cards'
import { DocumentsBlock, ProjectsBlock } from '@/components/blocks/blocks'
import { Badge, Container, EmptyState, SectionTitle } from '@/components/ui/misc'
import { InlineLeadForm, LeadButton, PageLeadContext } from '@/components/forms/lead-provider'

type Params = { direction: string }

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { direction: slug } = await params
  const [d, s] = await Promise.all([getDirectionBySlug(slug), getSiteSettings()])
  if (!d) return {}
  const meta = (d as { meta?: { title?: string | null; description?: string | null; image?: unknown } }).meta
  return buildMetadata({
    title: `${d.title} от производителя — ${s.companyName}`,
    description: d.shortDescription,
    path: `/produkciya/${d.slug}`,
    image: imageOf(d.cover, 'card')?.url,
    metaTitle: meta?.title,
    metaDescription: meta?.description,
  })
}

export default async function DirectionPage({ params }: { params: Promise<Params> }) {
  const { direction: slug } = await params
  const d = await getDirectionBySlug(slug)
  if (!d) notFound()

  const crumbs = [
    { name: 'Продукция', path: '/produkciya' },
    { name: d.title, path: `/produkciya/${d.slug}` },
  ]
  const [projects, docs] = await Promise.all([getProjectsByDirection(d.id, 6), getDocuments({ directionId: d.id })])
  const dirRef = { id: d.id, title: d.title }

  if (d.type === 'service') {
    const svc = d.service
    const cover = imageOf(d.cover, 'hero')
    return (
      <>
        <PageLeadContext type="calculation" direction={dirRef} hint={svc?.formHint ?? undefined} />
        <Breadcrumbs items={crumbs} />
        <Container className="py-8">
          <section className="grid items-center gap-8 lg:grid-cols-2">
            <div>
              <h1 className="page-title font-display text-3xl font-bold md:text-5xl">{d.title}</h1>
              <p className="mt-4 text-lg text-muted-fg">{d.heroText || d.shortDescription}</p>
              <LeadButton type="calculation" direction={dirRef} hint={svc?.formHint ?? undefined} label="Запросить расчёт" className="mt-6" />
            </div>
            {cover ? <ImageBox src={cover} fit="cover" sizes="(min-width:1024px) 50vw, 100vw" priority /> : null}
          </section>

          {(svc?.workScope ?? []).length ? (
            <section className="mt-14">
              <SectionTitle>Что делаем</SectionTitle>
              <ul className="mt-6 grid gap-3 md:grid-cols-2">
                {(svc?.workScope ?? []).map((w) => (
                  <li key={w.id ?? w.item} className="flex items-start gap-2">
                    <CheckCircle2 className="mt-0.5 size-5 shrink-0" /> {w.item}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {(svc?.objectTypes ?? []).length ? (
            <section className="mt-14">
              <SectionTitle>Для каких объектов</SectionTitle>
              <div className="mt-6 flex flex-wrap gap-2">
                {(svc?.objectTypes ?? []).map((o) => (
                  <Badge key={o.id ?? o.item} className="px-3 py-1.5 text-sm">
                    {o.item}
                  </Badge>
                ))}
              </div>
            </section>
          ) : null}

          {(svc?.stages ?? []).length ? (
            <section className="mt-14">
              <SectionTitle>Этапы работы</SectionTitle>
              <ol className="mt-6 grid gap-6 lg:auto-cols-fr lg:grid-flow-col">
                {(svc?.stages ?? []).map((s, i) => (
                  <li key={s.id ?? s.title} className="border-t-2 border-fg pt-4">
                    <span className="font-display text-2xl font-bold">{String(i + 1).padStart(2, '0')}</span>
                    <h3 className="mt-1 font-bold">{s.title}</h3>
                    {s.text ? <p className="mt-1 text-sm text-muted-fg">{s.text}</p> : null}
                  </li>
                ))}
              </ol>
            </section>
          ) : null}

          {projects.length ? (
            <ProjectsBlock projects={projects} title="Реализованные объекты" />
          ) : (
            <p className="mt-14 text-muted-fg">Покажем примеры работ по запросу.</p>
          )}

          <DocumentsBlock docs={docs} title="Документы и допуски" />

          {hasRichText(d.description) ? <RichText data={d.description} className="mt-14 max-w-3xl" /> : null}

          <section className="mt-14 max-w-2xl">
            <SectionTitle>Запросить расчёт</SectionTitle>
            <div className="mt-6">
              <InlineLeadForm type="calculation" direction={dirRef} hint={svc?.formHint ?? undefined} />
            </div>
          </section>
        </Container>
      </>
    )
  }

  // каталог: категории
  const categories = await getCategoriesByDirection(d.id)
  const images = await Promise.all(
    categories.map(async (c) => {
      const own = imageOf(c.cover, 'card')
      if (own) return own
      const { docs } = await getProducts({ categoryId: c.id, page: 1 })
      return imageOf(docs[0]?.gallery?.[0], 'card')
    }),
  )

  return (
    <>
      <PageLeadContext type="quote" direction={dirRef} />
      <Breadcrumbs items={crumbs} />
      <Container className="py-8">
        <h1 className="page-title font-display text-3xl font-bold md:text-5xl">{d.title}</h1>
        {d.heroText ? <p className="mt-3 max-w-3xl text-muted-fg">{d.heroText}</p> : null}

        {categories.length ? (
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {categories.map((c, i) => (
              <CategoryCard key={c.id} c={c} directionSlug={d.slug} image={images[i]} />
            ))}
          </div>
        ) : (
          <div className="mt-8">
            <EmptyState
              action={<LeadButton type="quote" direction={dirRef} label="Запросить каталог" />}
            >
              <Factory className="mx-auto mb-3 size-8" />
              Каталог направления наполняется. Оставьте запрос — пришлём актуальный перечень изделий.
            </EmptyState>
          </div>
        )}

        <ProjectsBlock projects={projects} title="Объекты с этой продукцией" />
        <DocumentsBlock docs={docs} />
        {hasRichText(d.description) ? <RichText data={d.description} className="mt-14 max-w-3xl" /> : null}

        <section className="mt-14 flex flex-col items-start gap-4 rounded-[4px] border border-border bg-muted p-6 md:flex-row md:items-center md:justify-between">
          <p className="font-display text-xl font-bold">Не нашли нужное? Изготовим по вашему ТЗ.</p>
          <LeadButton type="quote" direction={dirRef} label="Запросить КП" />
        </section>
      </Container>
    </>
  )
}
