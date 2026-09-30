import type { ReactNode } from 'react'
import { cn } from '@/lib/format'

export function Container({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('mx-auto w-full max-w-[1280px] px-4 md:px-6 lg:px-8', className)}>{children}</div>
}

export function Badge({ children, className, mono }: { children: ReactNode; className?: string; mono?: boolean }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-[4px] border border-border bg-muted px-2 py-0.5 text-xs',
        mono && 'font-mono',
        className,
      )}
    >
      {children}
    </span>
  )
}

export function SectionTitle({ children, as: Tag = 'h2', className }: { children: ReactNode; as?: 'h1' | 'h2' | 'h3'; className?: string }) {
  return <Tag className={cn('font-display text-2xl font-bold md:text-3xl', className)}>{children}</Tag>
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-[4px] bg-muted', className)} aria-hidden />
}

export function EmptyState({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="rounded-[4px] border border-border bg-muted p-8 text-center">
      <p className="mx-auto max-w-xl text-muted-fg">{children}</p>
      {action ? <div className="mt-4 flex justify-center">{action}</div> : null}
    </div>
  )
}
