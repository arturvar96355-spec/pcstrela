import type { Metadata } from 'next'
import Link from 'next/link'
import { searchAll } from '@/lib/queries'
import { Breadcrumbs } from '@/components/layout/breadcrumbs'
import { Container } from '@/components/ui/misc'
import { LeadButton } from '@/components/forms/lead-provider'

export const metadata: Metadata = { title: 'Поиск', robots: { index: false, follow: false } }

type Search = { q?: string }

const GROUPS = [
  ['product', 'Изделия'],
  ['category', 'Категории'],
  ['direction', 'Направления'],
  ['project', 'Объекты'],
] as const

export default async function SearchPage({ searchParams }: { searchParams: Promise<Search> }) {
  const { q = '' } = await searchParams
  const query = q.trim().slice(0, 60)
  const tooShort = query.length < 2
  const { hits } = tooShort ? { hits: [] } : await searchAll(query, 20)

  return (
    <>
      <Breadcrumbs items={[{ name: 'Поиск', path: '/poisk' }]} />
      <Container className="py-8">
        <h1 className="font-display text-3xl font-bold">{tooShort ? 'Поиск' : `Результаты поиска: «${query}»`}</h1>
        {tooShort ? (
          <p className="mt-4 text-muted-fg">Введите минимум 2 символа.</p>
        ) : hits.length === 0 ? (
          <div className="mt-6">
            <p className="text-muted-fg">Ничего не найдено по запросу «{query}». Напишите нам — подберём аналог.</p>
            <div className="mt-4">
              <LeadButton type="quote" message={`Ищу: ${query}`} label="Написать нам" />
            </div>
          </div>
        ) : (
          GROUPS.map(([type, label]) => {
            const items = hits.filter((h) => h.type === type)
            if (!items.length) return null
            return (
              <section key={type} className="mt-8">
                <h2 className="font-display text-xl font-bold">{label}</h2>
                <ul className="mt-3 divide-y divide-border border-y border-border">
                  {items.map((h) => (
                    <li key={h.url}>
                      <Link href={h.url} className="flex items-center gap-4 py-3 hover:bg-muted">
                        {h.image ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={h.image} alt="" width={64} height={48} className="h-12 w-16 bg-muted object-contain" />
                        ) : null}
                        <span>
                          <span className="block font-medium">{h.title}</span>
                          <span className="block text-sm text-muted-fg">{h.subtitle}</span>
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            )
          })
        )}
      </Container>
    </>
  )
}
