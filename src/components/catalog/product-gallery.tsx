'use client'

import { useState } from 'react'
import Image from 'next/image'
import { ChevronLeft, ChevronRight, ImageOff } from 'lucide-react'
import { Modal } from '@/components/ui/modal'
import { cn } from '@/lib/format'

type Img = { url: string; full: string; alt: string }

export function ProductGallery({ photos, drawing }: { photos: Img[]; drawing: Img | null }) {
  const [tab, setTab] = useState<'photo' | 'drawing'>('photo')
  const [idx, setIdx] = useState(0)
  const [zoom, setZoom] = useState(false)
  const current = tab === 'drawing' && drawing ? drawing : photos[idx]

  const step = (d: number) => setIdx((i) => (i + d + photos.length) % photos.length)

  return (
    <div>
      {drawing ? (
        <div role="tablist" className="mb-3 flex gap-2">
          {(['photo', 'drawing'] as const).map((t) => (
            <button
              key={t}
              role="tab"
              aria-selected={tab === t}
              onClick={() => setTab(t)}
              className={cn('min-h-11 rounded-[4px] border px-4 text-sm font-medium', tab === t ? 'border-fg bg-fg text-bg' : 'border-border')}
            >
              {t === 'photo' ? 'Фото' : 'Чертёж'}
            </button>
          ))}
        </div>
      ) : null}

      <button type="button" onClick={() => current && setZoom(true)} className="relative block aspect-[4/3] w-full overflow-hidden rounded-[4px] bg-muted" aria-label="Открыть на весь экран">
        {current ? (
          <Image src={current.full} alt={current.alt} fill priority sizes="(min-width:1024px) 58vw, 100vw" className="object-contain" />
        ) : (
          <span className="absolute inset-0 grid place-items-center text-muted-fg">
            <ImageOff className="size-10" aria-label="Нет фото" />
          </span>
        )}
      </button>

      {tab === 'photo' && photos.length > 1 ? (
        <ul className="mt-3 grid grid-cols-4 gap-2 sm:grid-cols-6">
          {photos.map((p, i) => (
            <li key={p.url}>
              <button
                type="button"
                onClick={() => setIdx(i)}
                aria-label={`Фото ${i + 1}`}
                className={cn('relative block aspect-[4/3] w-full overflow-hidden rounded-[4px] border bg-muted', i === idx ? 'border-fg' : 'border-border')}
              >
                <Image src={p.url} alt="" fill sizes="120px" className="object-contain" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      <Modal open={zoom} onClose={() => setZoom(false)} title={current?.alt || 'Фото'} className="md:max-w-[960px]">
        {current ? (
          <div className="relative">
            <div className="relative aspect-[4/3] w-full bg-muted">
              <Image src={current.full} alt={current.alt} fill sizes="960px" className="object-contain" />
            </div>
            {tab === 'photo' && photos.length > 1 ? (
              <>
                <button type="button" aria-label="Назад" onClick={() => step(-1)} className="absolute left-2 top-1/2 grid size-11 -translate-y-1/2 place-items-center bg-bg/90">
                  <ChevronLeft />
                </button>
                <button type="button" aria-label="Вперёд" onClick={() => step(1)} className="absolute right-2 top-1/2 grid size-11 -translate-y-1/2 place-items-center bg-bg/90">
                  <ChevronRight />
                </button>
              </>
            ) : null}
          </div>
        ) : null}
      </Modal>
    </div>
  )
}
