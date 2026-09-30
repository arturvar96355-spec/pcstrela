'use client'

import type { ReactNode } from 'react'
import { track, type Goal } from '@/lib/analytics'

export function DownloadLink({ href, goal, className, children }: { href: string; goal: Goal; className?: string; children: ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={className} onClick={() => track(goal)}>
      {children}
    </a>
  )
}

export function TrackedLink({ href, goal, className, children, label }: { href: string; goal: Goal; className?: string; children: ReactNode; label?: string }) {
  return (
    <a href={href} className={className} aria-label={label} onClick={() => track(goal)}>
      {children}
    </a>
  )
}
