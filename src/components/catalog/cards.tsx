import Link from 'next/link'
import Image from 'next/image'
import { ArrowRight, ImageOff, Ruler } from 'lucide-react'
import type { Category, Direction, Product, Project } from '@/payload-types'
import { formatDimensions, pluralize } from '@/lib/format'
import { imageOf } from '@/lib/media'
import { Badge } from '@/components/ui/misc'
import { buttonClass } from '@/components/ui/button'
import { LeadButton } from '@/components/forms/lead-provider'

export function ImageBox({
  src,
  ratio = '4/3',
  fit = 'contain',
  sizes,
  priority,
}: {
  src: { url: string; alt: string } | null
  ratio?: '4/3' | '16/10' | '3/4'
  fit?: 'contain' | 'cover'
  sizes?: string
  priority?: boolean
}) {
  const aspect = ratio === '4/3' ? 'aspect-[4/3]' : ratio === '16/10' ? 'aspect-[16/10]' : 'aspect-[3/4]'
  return (
    <div className={`relative w-full overflow-hidden bg-muted ${aspect}`}>
      {src ? (
        <Image
          src={src.url}
          alt={src.alt}
          fill
          sizes={sizes ?? '(min-width:1280px) 300px, (min-width:768px) 33vw, 100vw'}
          className={fit === 'contain' ? 'object-contain' : 'object-cover'}
          priority={priority}
        />
      ) : (
        <div className="absolute inset-0 grid place-items-center text-muted-fg">
          <ImageOff className="size-8" aria-label="Нет фото" />
        </div>
      )}
    </div>
  )
}

export function DirectionCard({ d }: { d: Direction }) {
  return (
    <Link href={`/produkciya/${d.slug}`} className="card-lift group block overflow-hidden rounded-[4px] border border-border bg-bg">
      <ImageBox src={imageOf(d.cover, 'card')} fit="cover" />
      <div className="p-4">
        <h3 className="font-display text-lg font-bold">{d.title}</h3>
        <p className="mt-1 text-sm text-muted-fg">{d.shortDescription}</p>
        <ArrowRight className="mt-3 size-5 text-accent transition-transform duration-300 group-hover:translate-x-2" />
      </div>
    </Link>
  )
}

export function CategoryCard({ c, directionSlug, image }: { c: Category & { productCount: number }; directionSlug: string; image: { url: string; alt: string } | null }) {
  return (
    <Link href={`/produkciya/${directionSlug}/${c.slug}`} className="card-lift group block overflow-hidden rounded-[4px] border border-border bg-bg">
      <ImageBox src={image} />
      <div className="p-4">
        <h3 className="font-display text-lg font-bold">{c.title}</h3>
        <p className="mt-1 text-sm text-muted-fg">
          {c.productCount} {pluralize(c.productCount, 'модель', 'модели', 'моделей')}
        </p>
      </div>
    </Link>
  )
}

export function ProductCard({ p, href }: { p: Product; href: string }) {
  const first = p.gallery?.[0]
  const dims = formatDimensions(p.lengthMm, p.widthMm, p.heightMm)
  return (
    <article className="card-lift flex flex-col overflow-hidden rounded-[4px] border border-border bg-bg">
      <Link href={href} className="block">
        <ImageBox src={imageOf(first, 'card')} />
      </Link>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <Badge mono className="self-start">
          {p.sku}
        </Badge>
        <h3 className="font-display text-base font-bold">
          <Link href={href}>{p.title}</Link>
        </h3>
        {dims ? (
          <p className="flex items-center gap-1.5 text-sm text-muted-fg">
            <Ruler className="size-4" /> {dims}
          </p>
        ) : null}
        <div className="mt-auto flex flex-wrap gap-2 pt-2">
          <Link href={href} className={buttonClass('secondary', 'flex-1 px-3')}>
            Подробнее
          </Link>
          <LeadButton type="quote" product={{ id: p.id, title: p.title, sku: p.sku }} label="Запросить КП" className="flex-1 px-3" />
        </div>
      </div>
    </article>
  )
}

export function ProjectCard({ p }: { p: Project }) {
  const dirs = (p.directions ?? []).filter((d): d is Direction => typeof d !== 'string')
  return (
    <Link href={`/obekty/${p.slug}`} className="card-lift group block overflow-hidden rounded-[4px] border border-border bg-bg">
      <ImageBox src={imageOf(p.cover, 'card')} ratio="16/10" fit="cover" />
      <div className="space-y-2 p-4">
        <p className="text-sm text-muted-fg">
          {[p.year, p.city].filter(Boolean).join(' · ')}
        </p>
        <h3 className="font-display text-base font-bold">{p.title}</h3>
        <p className="line-clamp-3 text-sm text-muted-fg">{p.summary}</p>
        {dirs.length ? (
          <div className="flex flex-wrap gap-1.5">
            {dirs.map((d) => (
              <Badge key={d.id}>{d.title}</Badge>
            ))}
          </div>
        ) : null}
      </div>
    </Link>
  )
}
