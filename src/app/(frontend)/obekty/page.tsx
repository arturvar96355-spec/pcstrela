import type { Metadata } from 'next'
import Link from 'next/link'
import { getDirectionIdsWithProjects, getDirections, getProjects, getSiteSettings } from '@/lib/queries'
import { buildMetadata } from '@/lib/seo'
import { Breadcrumbs } from '@/components/layout/breadcrumbs'
import { ProjectCard } from '@/components/catalog/cards'
import { Pagination } from '@/components/catalog/pagination'
import { Container, EmptyState } from '@/components/ui/misc'
import { LeadButton } from '@/components/forms/lead-provider'
import { buttonClass } from '@/components/ui/button'
import { cn } from '@/lib/format'

type Search = { direction?: string; page?: string }

export async function generateMetadata(): Promise<Metadata> {
  const s = await getSiteSettings()
  return buildMetadata({
    title: `Объекты — ${s.companyName}`,
    description: 'Реализованные объекты: благоустройство, фасады, тепловые узлы, шумозащитные кожухи и другие работы.',
    path: '/obekty',
  })
}

export default async function ProjectsPage({ searchParams }: { searchParams: Promise<Search> }) {
  const sp = await searchParams
  const directions = await getDirections()
  const active = directions.find((d) => d.slug === sp.direction) // неизвестный direction игнорируем
  const page = Math.max(1, Number.isInteger(Number(sp.page)) ? Number(sp.page) : 1)
  const [res, totalAll, withProjects] = await Promise.all([
    getProjects({ directionSlug: active?.slug, page }),
    getProjects({ page: 1 }),
    getDirectionIdsWithProjects(),
  ])
  const all = totalAll
  // фильтр показывает только направления, у которых есть объекты
  const filters = directions.filter((d) => withProjects.has(d.id))

  return (
    <>
      <Breadcrumbs items={[{ name: 'Объекты', path: '/obekty' }]} />
      <Container className="py-8">
        <h1 className="font-display text-3xl font-bold md:text-4xl">Объекты</h1>

        {all.totalDocs === 0 ? (
          <div className="mt-8">
            <EmptyState action={<LeadButton type="callback" label="Запросить примеры работ" />}>
              Раздел наполняется. Покажем примеры работ по запросу.
            </EmptyState>
          </div>
        ) : (
          <>
            <div className="-mx-4 mt-6 flex gap-2 overflow-x-auto px-4 pb-2">
              <Link href="/obekty" className={cn(buttonClass(active ? 'secondary' : 'primary'), 'shrink-0')}>
                Все
              </Link>
              {filters.map((d) => (
                <Link key={d.id} href={`/obekty?direction=${d.slug}`} className={cn(buttonClass(active?.id === d.id ? 'primary' : 'secondary'), 'shrink-0')}>
                  {d.title}
                </Link>
              ))}
            </div>

            {res.docs.length ? (
              <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {res.docs.map((p) => (
                  <ProjectCard key={p.id} p={p} />
                ))}
              </div>
            ) : (
              <div className="mt-6">
                <EmptyState action={<Link href="/obekty" className={buttonClass('secondary')}>Показать все</Link>}>
                  По этому направлению объекты скоро появятся.
                </EmptyState>
              </div>
            )}
            <Pagination page={res.page} totalPages={res.totalPages} basePath="/obekty" query={{ direction: active?.slug }} />
          </>
        )}
      </Container>
    </>
  )
}
