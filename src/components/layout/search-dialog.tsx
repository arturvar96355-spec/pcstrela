'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { AlertCircle, Search } from 'lucide-react'
import { Modal } from '@/components/ui/modal'
import { Skeleton } from '@/components/ui/misc'
import { track } from '@/lib/analytics'

type Hit = { type: 'product' | 'category' | 'direction' | 'project'; title: string; subtitle: string; url: string; image: string | null }

const GROUPS: Array<[Hit['type'], string]> = [
  ['product', 'Изделия'],
  ['category', 'Категории'],
  ['direction', 'Направления'],
  ['project', 'Объекты'],
]

export function SearchButton() {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setOpen(true)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <>
      <button type="button" aria-label="Поиск" onClick={() => setOpen(true)} className="grid size-11 place-items-center hover:bg-muted">
        <Search className="size-5" />
      </button>
      <SearchDialog open={open} onClose={() => setOpen(false)} />
    </>
  )
}

function SearchDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter()
  const [q, setQ] = useState('')
  const [hits, setHits] = useState<Hit[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)
  const [active, setActive] = useState(-1)
  const inputRef = useRef<HTMLInputElement>(null)
  const seq = useRef(0)

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50)
  }, [open])

  const run = useCallback(async (query: string) => {
    const my = ++seq.current
    setLoading(true)
    setError(false)
    try {
      const res = await fetch(`/api/public/search?q=${encodeURIComponent(query)}&limit=8`)
      const json = (await res.json()) as { data?: Hit[] }
      if (my !== seq.current) return
      if (!res.ok) throw new Error('search failed')
      setHits(json.data ?? [])
      setActive(-1)
      track('search_used')
    } catch {
      if (my === seq.current) setError(true)
    } finally {
      if (my === seq.current) setLoading(false)
    }
  }, [])

  useEffect(() => {
    const t = q.trim()
    if (t.length < 2) {
      setHits(null)
      setLoading(false)
      return
    }
    const timer = setTimeout(() => run(t), 300)
    return () => clearTimeout(timer)
  }, [q, run])

  const flat = hits ?? []
  const go = (url: string) => {
    onClose()
    router.push(url)
  }

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActive((a) => Math.min(a + 1, flat.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((a) => Math.max(a - 1, -1))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (active >= 0 && flat[active]) go(flat[active].url)
      else if (q.trim().length >= 2) go(`/poisk?q=${encodeURIComponent(q.trim())}`)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Поиск по сайту">
      <input
        ref={inputRef}
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder="Название или артикул, например УР-02"
        aria-label="Поиск"
        className="min-h-11 w-full rounded-[4px] border border-border px-3 text-base outline-none focus:border-fg"
      />
      <div className="mt-3 min-h-16">
        {q.trim().length > 0 && q.trim().length < 2 ? <p className="text-sm text-muted-fg">Введите минимум 2 символа</p> : null}
        {loading ? (
          <div className="space-y-2">
            <Skeleton className="h-10" />
            <Skeleton className="h-10" />
            <Skeleton className="h-10" />
          </div>
        ) : error ? (
          <p className="flex items-center gap-2 text-sm text-danger">
            <AlertCircle className="size-4" /> Поиск временно недоступен
          </p>
        ) : hits && hits.length === 0 ? (
          <p className="text-sm text-muted-fg">
            Ничего не найдено. Напишите нам — подберём аналог.{' '}
            <Link href="/kontakty" onClick={onClose} className="underline">
              Контакты
            </Link>
          </p>
        ) : hits ? (
          <div>
            {GROUPS.map(([type, label]) => {
              const items = flat.filter((h) => h.type === type)
              if (!items.length) return null
              return (
                <div key={type} className="mb-2">
                  <p className="mb-1 text-xs uppercase tracking-wide text-muted-fg">{label}</p>
                  {items.map((h) => {
                    const idx = flat.indexOf(h)
                    return (
                      <button
                        key={h.url}
                        type="button"
                        onClick={() => go(h.url)}
                        className={`flex w-full items-center gap-3 rounded-[4px] p-2 text-left hover:bg-muted ${idx === active ? 'bg-muted' : ''}`}
                      >
                        {h.image ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={h.image} alt="" width={48} height={36} className="h-9 w-12 rounded-[2px] bg-muted object-contain" />
                        ) : null}
                        <span>
                          <span className="block text-sm font-medium">{h.title}</span>
                          <span className="block text-xs text-muted-fg">{h.subtitle}</span>
                        </span>
                      </button>
                    )
                  })}
                </div>
              )
            })}
            <button type="button" onClick={() => go(`/poisk?q=${encodeURIComponent(q.trim())}`)} className="mt-1 text-sm underline">
              Все результаты
            </button>
          </div>
        ) : null}
      </div>
    </Modal>
  )
}
