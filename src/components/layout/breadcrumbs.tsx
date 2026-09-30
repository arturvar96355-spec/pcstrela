import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import { JsonLd } from './json-ld'
import { breadcrumbLd } from '@/lib/seo'
import { Container } from '@/components/ui/misc'

export type Crumb = { name: string; path: string }

export function Breadcrumbs({ items }: { items: Crumb[] }) {
  const all = [{ name: 'Главная', path: '/' }, ...items]
  return (
    <Container className="pt-4">
      <nav aria-label="Навигация" className="text-sm text-muted-fg">
        <ol className="flex flex-wrap items-center gap-1">
          {all.map((c, i) => (
            <li key={c.path} className="flex items-center gap-1">
              {i > 0 ? <ChevronRight className="size-3.5" aria-hidden /> : null}
              {i === all.length - 1 ? (
                <span aria-current="page" className="text-fg">
                  {c.name}
                </span>
              ) : (
                <Link href={c.path} className="hover:text-fg hover:underline">
                  {c.name}
                </Link>
              )}
            </li>
          ))}
        </ol>
      </nav>
      <JsonLd data={breadcrumbLd(all)} />
    </Container>
  )
}
