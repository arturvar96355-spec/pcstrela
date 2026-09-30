import type { MetadataRoute } from 'next'
import { getSitemapData } from '@/lib/queries'
import { SITE_URL } from '@/lib/seo'

export const dynamic = 'force-dynamic'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const d = await getSitemapData()
  const u = (path: string, lastModified?: string): MetadataRoute.Sitemap[number] => ({
    url: `${SITE_URL}${path}`,
    ...(lastModified ? { lastModified } : {}),
  })
  const entries: MetadataRoute.Sitemap = [u('/'), u('/produkciya'), u('/obekty'), u('/dokumenty'), u('/kontakty')]
  for (const x of d.directions) entries.push(u(`/produkciya/${x.slug}`, x.updatedAt))
  for (const c of d.categories) if (typeof c.direction !== 'string') entries.push(u(`/produkciya/${c.direction.slug}/${c.slug}`, c.updatedAt))
  for (const p of d.products) {
    if (typeof p.direction === 'string' || typeof p.category === 'string') continue
    entries.push(u(`/produkciya/${p.direction.slug}/${p.category.slug}/${p.slug}`, p.updatedAt))
  }
  for (const p of d.projects) entries.push(u(`/obekty/${p.slug}`, p.updatedAt))
  for (const p of d.pages) entries.push(u(`/${p.slug}`, p.updatedAt))
  return entries
}
