import type { Metadata } from 'next'
import Image from 'next/image'
import { notFound } from 'next/navigation'
import { MapPin } from 'lucide-react'
import type { Direction, Product } from '@/payload-types'
import { getProjectBySlug, getSiteSettings } from '@/lib/queries'
import { buildMetadata } from '@/lib/seo'
import { imageOf } from '@/lib/media'
import { Breadcrumbs } from '@/components/layout/breadcrumbs'
import { RichText, hasRichText } from '@/components/layout/rich-text'
import { ImageBox, ProductCard } from '@/components/catalog/cards'
import { Badge, Container, SectionTitle } from '@/components/ui/misc'
import { LeadButton } from '@/components/forms/lead-provider'

type Params = { slug: string }

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { slug } = await params
  const [p, s] = await Promise.all([getProjectBySlug(slug), getSiteSettings()])
  if (!p) return {}
  const meta = (p as { meta?: { title?: string | null; description?: string | null } }).meta
  return buildMetadata({
    title: `${[p.title, p.city, p.year].filter(Boolean).join(', ')} — объекты ${s.companyName}`,
    description: p.summary,
    path: `/obekty/${p.slug}`,
    image: imageOf(p.cover, 'card')?.url,
    metaTitle: meta?.title,
    metaDescription: meta?.description,
  })
}

export default async function ProjectPage({ params }: { params: Promise<Params> }) {
  const { slug } = await params
  const p = await getProjectBySlug(slug)
  if (!p) notFound()
  const dirs = (p.directions ?? []).filter((d): d is Direction => typeof d !== 'string')
  const products = (p.products ?? []).filter((x): x is Product => typeof x !== 'string' && x._status === 'published')
  const gallery = (p.gallery ?? []).map((g) => ({ thumb: imageOf(g, 'card'), full: imageOf(g, 'hero') })).filter((g) => g.thumb)

  return (
    <>
      <Breadcrumbs items={[{ name: 'Объекты', path: '/obekty' }, { name: p.title, path: `/obekty/${p.slug}` }]} />
      <Container className="py-8">
        <h1 className="page-title font-display text-3xl font-bold md:text-5xl">{p.title}</h1>
        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-fg">
          <span className="flex items-center gap-1">
            <MapPin className="size-4" /> {p.city}
          </span>
          {p.year ? <span>{p.year}</span> : null}
          {p.customerName ? <span>Заказчик: {p.customerName}</span> : null}
          {dirs.map((d) => (
            <Badge key={d.id}>{d.title}</Badge>
          ))}
        </div>

        {p.cover ? (
          <div className="mt-6">
            <ImageBox src={imageOf(p.cover, 'hero')} ratio="16/10" fit="cover" sizes="(min-width:1280px) 1200px, 100vw" priority />
          </div>
        ) : null}

        <p className="mt-6 max-w-3xl text-lg">{p.summary}</p>
        {hasRichText(p.description) ? <RichText data={p.description} className="mt-6 max-w-3xl" /> : null}

        {gallery.length ? (
          <section className="mt-12">
            <SectionTitle>Фото</SectionTitle>
            <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {gallery.map((g) => (
                <div key={g.thumb!.url} className="relative aspect-[16/10] overflow-hidden rounded-[4px] bg-muted">
                  <Image src={g.thumb!.url} alt={g.thumb!.alt || p.title} fill sizes="(min-width:1024px) 33vw, 50vw" className="object-cover" />
                </div>
              ))}
            </div>
          </section>
        ) : null}

        {products.length ? (
          <section className="mt-12">
            <SectionTitle>Использованные изделия</SectionTitle>
            <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {products.map((x) => {
                const d = typeof x.direction === 'string' ? null : x.direction
                const c = typeof x.category === 'string' ? null : x.category
                if (!d || !c) return null
                return <ProductCard key={x.id} p={x} href={`/produkciya/${d.slug}/${c.slug}/${x.slug}`} />
              })}
            </div>
          </section>
        ) : null}

        <section className="mt-14 flex flex-col items-start gap-4 rounded-[4px] border border-border bg-muted p-6 md:flex-row md:items-center md:justify-between">
          <p className="font-display text-xl font-bold">Нужен похожий объект?</p>
          <LeadButton type="callback" message={`Интересует объект, похожий на «${p.title}»`} label="Обсудить задачу" />
        </section>
      </Container>
    </>
  )
}
