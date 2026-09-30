'use client'

import { useEffect, useRef, type ReactNode } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/format'

// Нативный <dialog>: десктоп — по центру, мобильный — панель снизу (или справа при side).
export function Modal({
  open,
  onClose,
  title,
  children,
  side = false,
  className,
}: {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  side?: boolean
  className?: string
}) {
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const d = ref.current
    if (!d) return
    if (open && !d.open) d.showModal()
    if (!open && d.open) d.close()
  }, [open])

  return (
    <dialog
      ref={ref}
      aria-label={title}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose()
      }}
      className={cn(
        'm-0 w-full max-w-none bg-bg p-0 text-fg backdrop:bg-black/50',
        side
          ? 'fixed inset-y-0 right-0 left-auto h-full max-w-sm overflow-y-auto'
          : 'fixed inset-x-0 top-auto bottom-0 max-h-[92dvh] overflow-y-auto rounded-t-[8px] md:inset-auto md:top-1/2 md:left-1/2 md:max-w-[560px] md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-[4px]',
        className,
      )}
    >
      {open ? (
        <div className="p-5 md:p-6">
          <div className="mb-4 flex items-start justify-between gap-4">
            <h2 className="font-display text-xl font-bold">{title}</h2>
            <button type="button" onClick={onClose} aria-label="Закрыть" className="-m-2 p-2 hover:bg-muted">
              <X className="size-5" />
            </button>
          </div>
          {children}
        </div>
      ) : null}
    </dialog>
  )
}
