import { revalidatePath } from 'next/cache'
import type { CollectionAfterChangeHook, CollectionAfterDeleteHook, GlobalAfterChangeHook } from 'payload'

type Target = [path: string, type?: 'layout' | 'page']

const run = (targets: Target[], ctx: Record<string, unknown>) => {
  if (ctx.disableRevalidate) return // seed-скрипт передаёт context: { disableRevalidate: true }
  for (const [p, t] of targets) {
    try {
      revalidatePath(p, t)
    } catch {
      // вне контекста Next.js (скрипты) кэш не нужно сбрасывать
    }
  }
}

export const revalidateCollection =
  (targets: Target[]): CollectionAfterChangeHook =>
  ({ doc, context }) => {
    run(targets, context)
    return doc
  }

export const revalidateOnDelete =
  (targets: Target[]): CollectionAfterDeleteHook =>
  ({ doc, context }) => {
    run(targets, context)
    return doc
  }

export const revalidateGlobal =
  (targets: Target[]): GlobalAfterChangeHook =>
  ({ doc, context }) => {
    run(targets, context)
    return doc
  }

export const CATALOG_TARGETS: Target[] = [['/', 'page'], ['/produkciya', 'layout'], ['/sitemap.xml', 'page']]
export const PROJECTS_TARGETS: Target[] = [
  ['/', 'page'],
  ['/obekty', 'layout'],
  ['/produkciya', 'layout'],
  ['/sitemap.xml', 'page'],
]
export const DOCUMENTS_TARGETS: Target[] = [
  ['/', 'page'],
  ['/dokumenty', 'page'],
  ['/goszakazchikam', 'page'],
  ['/produkciya', 'layout'],
]
export const EVERYTHING: Target[] = [['/', 'layout']]
