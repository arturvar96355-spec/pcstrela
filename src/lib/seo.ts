import type { Metadata } from 'next'
import { truncateWords } from './format'

export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000').replace(/\/$/, '')

type MetaInput = {
  title: string
  description?: string | null
  path: string
  image?: string | null
  page?: number
  metaTitle?: string | null
  metaDescription?: string | null
  noindex?: boolean
}

export function absoluteUrl(path: string): string {
  return `${SITE_URL}${path.startsWith('/') ? path : `/${path}`}`
}

// Приоритет: поля SEO-плагина (meta.title / meta.description) → шаблон страницы.
export function buildMetadata(i: MetaInput): Metadata {
  const title = i.metaTitle || i.title
  const description = truncateWords(i.metaDescription || i.description || '', 160) || undefined
  const canonical = absoluteUrl(i.path) + (i.page && i.page > 1 ? `?page=${i.page}` : '')
  const image = i.image ? (i.image.startsWith('http') ? i.image : absoluteUrl(i.image)) : absoluteUrl('/og-default.png')
  return {
    title,
    description,
    alternates: { canonical },
    openGraph: { title, description, url: canonical, type: 'website', locale: 'ru_RU', images: [{ url: image }] },
    ...(i.noindex ? { robots: { index: false, follow: false } } : {}),
  }
}

export function jsonLd(data: unknown): string {
  // экранируем "<", чтобы JSON нельзя было использовать для выхода из <script>
  return JSON.stringify(data).replace(/</g, '\\u003c')
}

export function breadcrumbLd(items: Array<{ name: string; path: string }>) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((it, idx) => ({
      '@type': 'ListItem',
      position: idx + 1,
      name: it.name,
      item: absoluteUrl(it.path),
    })),
  }
}
