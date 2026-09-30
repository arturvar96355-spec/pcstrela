import Link from 'next/link'
import { ChevronLeft, ChevronRight } from 'lucide-react'

export function Pagination({ page, totalPages, basePath, query = {} }: { page: number; totalPages: number; basePath: string; query?: Record<string, string | undefined> }) {
  if (totalPages <= 1) return null
  const href = (n: number) => {
    const params = new URLSearchParams()
    for (const [k, v] of Object.entries(query)) if (v) params.set(k, v)
    if (n > 1) params.set('page', String(n))
    const qs = params.toString()
    return qs ? `${basePath}?${qs}` : basePath
  }
  const pages = Array.from({ length: totalPages }, (_, i) => i + 1)
  const cls = 'grid size-11 place-items-center rounded-[4px] border border-border text-sm hover:border-fg'
  return (
    <nav aria-label="Страницы" className="mt-10 flex flex-wrap items-center justify-center gap-2">
      {page > 1 ? (
        <Link href={href(page - 1)} aria-label="Назад" className={cls}>
          <ChevronLeft className="size-4" />
        </Link>
      ) : null}
      {pages.map((n) => (
        <Link key={n} href={href(n)} aria-current={n === page ? 'page' : undefined} className={`${cls} ${n === page ? 'bg-fg text-bg' : ''}`}>
          {n}
        </Link>
      ))}
      {page < totalPages ? (
        <Link href={href(page + 1)} aria-label="Вперёд" className={cls}>
          <ChevronRight className="size-4" />
        </Link>
      ) : null}
    </nav>
  )
}
