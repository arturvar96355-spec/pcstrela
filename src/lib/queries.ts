import 'server-only'
import { cache } from 'react'
import type { Where } from 'payload'
import type { Category, Direction, Document, HomePage, Page, Product, Project, SiteSetting } from '@/payload-types'
import { PAGE_SLUGS } from '@/collections/Pages'
import { getPayloadClient } from './payload'
import { startOfTodayMoscowISO } from './format'
import { relUrl } from './media'

// Все чтения данных для публичных страниц идут только через этот файл.
// Для коллекций с черновиками всегда draft: false и _status = published.

const published: Where = { _status: { equals: 'published' } }
const PRODUCTS_PER_PAGE = 24
const PROJECTS_PER_PAGE = 12

const idOf = (v: unknown): string | undefined =>
  typeof v === 'object' && v !== null ? (v as { id: string }).id : (v as string | undefined)

export type Paginated<T> = { docs: T[]; totalDocs: number; page: number; totalPages: number }

// --- настройки и главная ---

export const getSiteSettings = cache(async (): Promise<SiteSetting> => {
  const payload = await getPayloadClient()
  return payload.findGlobal({ slug: 'site-settings', depth: 1, overrideAccess: false })
})

export const getHomePage = cache(async (): Promise<HomePage> => {
  const payload = await getPayloadClient()
  return payload.findGlobal({ slug: 'home-page', depth: 1, overrideAccess: false })
})

// --- направления и категории ---

export const getDirections = cache(async (): Promise<Direction[]> => {
  const payload = await getPayloadClient()
  const res = await payload.find({
    collection: 'directions',
    sort: 'order',
    depth: 1,
    limit: 50,
    pagination: false,
    overrideAccess: false,
  })
  return res.docs
})

export const getDirectionBySlug = cache(async (slug: string): Promise<Direction | null> => {
  const payload = await getPayloadClient()
  const res = await payload.find({
    collection: 'directions',
    where: { slug: { equals: slug } },
    depth: 1,
    limit: 1,
    overrideAccess: false,
  })
  return res.docs[0] ?? null
})

export type CategoryWithCount = Category & { productCount: number }

export const getCategoriesByDirection = cache(async (directionId: string): Promise<CategoryWithCount[]> => {
  const payload = await getPayloadClient()
  const res = await payload.find({
    collection: 'categories',
    where: { direction: { equals: directionId } },
    sort: 'order',
    depth: 1,
    limit: 100,
    pagination: false,
    overrideAccess: false,
  })
  return Promise.all(
    res.docs.map(async (c) => {
      const { totalDocs } = await payload.count({
        collection: 'products',
        where: { and: [{ category: { equals: c.id } }, published] },
        overrideAccess: false,
      })
      return { ...c, productCount: totalDocs }
    }),
  )
})

export const getCategoryBySlugs = cache(
  async (directionSlug: string, categorySlug: string): Promise<{ direction: Direction; category: Category } | null> => {
    const direction = await getDirectionBySlug(directionSlug)
    if (!direction) return null
    const payload = await getPayloadClient()
    const res = await payload.find({
      collection: 'categories',
      where: { and: [{ slug: { equals: categorySlug } }, { direction: { equals: direction.id } }] },
      depth: 1,
      limit: 1,
      overrideAccess: false,
    })
    return res.docs[0] ? { direction, category: res.docs[0] } : null
  },
)

// --- товары ---

export const getProducts = cache(
  async ({ categoryId, page = 1 }: { categoryId: string; page?: number }): Promise<Paginated<Product>> => {
    const payload = await getPayloadClient()
    const res = await payload.find({
      collection: 'products',
      where: { and: [{ category: { equals: categoryId } }, published] },
      sort: ['order', 'title'],
      depth: 1,
      limit: PRODUCTS_PER_PAGE,
      page,
      draft: false,
      overrideAccess: false,
    })
    return { docs: res.docs, totalDocs: res.totalDocs, page: res.page ?? page, totalPages: res.totalPages }
  },
)

// Возвращает товар вместе с фактическими slug направления и категории (для проверки URL).
export const getProductBySlugs = cache(
  async (
    directionSlug: string,
    categorySlug: string,
    slug: string,
  ): Promise<{ product: Product; direction: Direction; category: Category; exact: boolean } | null> => {
    const payload = await getPayloadClient()
    const res = await payload.find({
      collection: 'products',
      where: { and: [{ slug: { equals: slug } }, published] },
      depth: 2,
      limit: 1,
      draft: false,
      overrideAccess: false,
    })
    const product = res.docs[0]
    if (!product || typeof product.direction === 'string' || typeof product.category === 'string') return null
    const direction = product.direction as Direction
    const category = product.category as Category
    return { product, direction, category, exact: direction.slug === directionSlug && category.slug === categorySlug }
  },
)

export const getFeaturedProducts = cache(async (limit = 8): Promise<Product[]> => {
  const payload = await getPayloadClient()
  const res = await payload.find({
    collection: 'products',
    where: { and: [{ featured: { equals: true } }, published] },
    sort: 'order',
    depth: 1,
    limit,
    draft: false,
    overrideAccess: false,
  })
  return res.docs
})

export const getSimilarProducts = cache(async (product: Product, limit = 4): Promise<Product[]> => {
  const related = (product.relatedProducts ?? []).filter((p): p is Product => typeof p !== 'string')
  if (related.length > 0) return related.slice(0, limit)
  const payload = await getPayloadClient()
  const res = await payload.find({
    collection: 'products',
    where: {
      and: [{ category: { equals: idOf(product.category) } }, { id: { not_equals: product.id } }, published],
    },
    sort: 'order',
    depth: 1,
    limit,
    draft: false,
    overrideAccess: false,
  })
  return res.docs
})

export const getProductCategoryUrl = (p: Product): string | null => {
  if (typeof p.direction === 'string' || typeof p.category === 'string') return null
  return `/produkciya/${p.direction.slug}/${p.category.slug}/${p.slug}`
}

// --- объекты ---

export const getProjects = cache(
  async ({ directionSlug, page = 1 }: { directionSlug?: string; page?: number } = {}): Promise<Paginated<Project>> => {
    const payload = await getPayloadClient()
    const and: Where[] = [published]
    if (directionSlug) {
      const d = await getDirectionBySlug(directionSlug)
      if (d) and.push({ directions: { contains: d.id } })
    }
    const res = await payload.find({
      collection: 'projects',
      where: { and },
      sort: '-year',
      depth: 1,
      limit: PROJECTS_PER_PAGE,
      page,
      draft: false,
      overrideAccess: false,
    })
    return { docs: res.docs, totalDocs: res.totalDocs, page: res.page ?? page, totalPages: res.totalPages }
  },
)

export const getProjectBySlug = cache(async (slug: string): Promise<Project | null> => {
  const payload = await getPayloadClient()
  const res = await payload.find({
    collection: 'projects',
    where: { and: [{ slug: { equals: slug } }, published] },
    depth: 2,
    limit: 1,
    draft: false,
    overrideAccess: false,
  })
  const project = res.docs[0]
  if (!project) return null
  // R-07: заказчик виден только при showCustomer = true
  if (!project.showCustomer) delete project.customerName
  return project
})

export const getProjectsByDirection = cache(async (directionId: string, limit = 6): Promise<Project[]> => {
  const payload = await getPayloadClient()
  const res = await payload.find({
    collection: 'projects',
    where: { and: [{ directions: { contains: directionId } }, published] },
    sort: '-year',
    depth: 1,
    limit,
    draft: false,
    overrideAccess: false,
  })
  return res.docs.map(stripCustomer)
})

export const getProjectsByProduct = cache(async (productId: string, limit = 4): Promise<Project[]> => {
  const payload = await getPayloadClient()
  const res = await payload.find({
    collection: 'projects',
    where: { and: [{ products: { contains: productId } }, published] },
    sort: '-year',
    depth: 1,
    limit,
    draft: false,
    overrideAccess: false,
  })
  return res.docs.map(stripCustomer)
})

export const getFeaturedProjects = cache(async (limit = 6): Promise<Project[]> => {
  const payload = await getPayloadClient()
  const featured = await payload.find({
    collection: 'projects',
    where: { and: [{ featured: { equals: true } }, published] },
    sort: '-year',
    depth: 1,
    limit,
    draft: false,
    overrideAccess: false,
  })
  let docs = featured.docs
  if (docs.length < 3) {
    const latest = await payload.find({
      collection: 'projects',
      where: published,
      sort: '-year',
      depth: 1,
      limit,
      draft: false,
      overrideAccess: false,
    })
    docs = latest.docs
  }
  return docs.map(stripCustomer)
})

function stripCustomer(p: Project): Project {
  if (!p.showCustomer) delete p.customerName
  return p
}

export const getDirectionIdsWithProjects = cache(async (): Promise<Set<string>> => {
  const payload = await getPayloadClient()
  const res = await payload.find({
    collection: 'projects',
    where: published,
    depth: 0,
    limit: 1000,
    pagination: false,
    draft: false,
    overrideAccess: false,
    select: { directions: true },
  })
  const ids = new Set<string>()
  for (const p of res.docs) for (const d of p.directions ?? []) ids.add(typeof d === 'string' ? d : d.id)
  return ids
})

// --- документы, страницы ---

export const getDocuments = cache(
  async ({ directionId, onlyHome, types, limit }: { directionId?: string; onlyHome?: boolean; types?: string[]; limit?: number } = {}): Promise<Document[]> => {
    const payload = await getPayloadClient()
    const and: Where[] = [
      // R-06: истёкшие документы скрыты (сравнение по Москве)
      { or: [{ validUntil: { exists: false } }, { validUntil: { greater_than_equal: startOfTodayMoscowISO() } }] },
    ]
    if (directionId) and.push({ directions: { contains: directionId } })
    if (onlyHome) and.push({ showOnHome: { equals: true } })
    if (types?.length) and.push({ docType: { in: types } })
    const res = await payload.find({
      collection: 'documents',
      where: { and },
      sort: 'order',
      depth: 1,
      limit: limit ?? 100,
      pagination: false,
      overrideAccess: false,
    })
    return res.docs
  },
)

export const getPage = cache(async (slug: string): Promise<Page | null> => {
  if (!PAGE_SLUGS.some((p) => p.value === slug)) return null
  const payload = await getPayloadClient()
  const res = await payload.find({
    collection: 'pages',
    where: { slug: { equals: slug } },
    depth: 1,
    limit: 1,
    overrideAccess: false,
  })
  return res.docs[0] ?? null
})

// --- поиск ---

export type SearchHit = {
  type: 'product' | 'category' | 'direction' | 'project'
  title: string
  subtitle: string
  url: string
  image: string | null
}

export async function searchAll(q: string, limit = 8): Promise<{ hits: SearchHit[]; total: number }> {
  const payload = await getPayloadClient()
  const like = { like: q }
  const [products, categories, directions, projects] = await Promise.all([
    payload.find({
      collection: 'products',
      where: { and: [published, { or: [{ title: like }, { sku: like }] }] },
      depth: 2,
      limit,
      draft: false,
      overrideAccess: false,
    }),
    payload.find({ collection: 'categories', where: { title: like }, depth: 1, limit: 5, overrideAccess: false }),
    payload.find({ collection: 'directions', where: { title: like }, depth: 0, limit: 5, overrideAccess: false }),
    payload.find({
      collection: 'projects',
      where: { and: [published, { title: like }] },
      depth: 0,
      limit: 5,
      draft: false,
      overrideAccess: false,
    }),
  ])

  const ql = q.toLowerCase()
  const sortedProducts = [...products.docs].sort(
    (a, b) => Number(b.sku.toLowerCase() === ql) - Number(a.sku.toLowerCase() === ql),
  )

  const hits: SearchHit[] = []
  for (const p of sortedProducts) {
    if (typeof p.direction === 'string' || typeof p.category === 'string') continue
    const first = p.gallery?.[0]
    const rawImg = first && typeof first !== 'string' ? (first.sizes?.thumb?.url ?? first.url ?? null) : null
    const img = rawImg ? relUrl(rawImg) : null
    hits.push({
      type: 'product',
      title: p.title,
      subtitle: `${p.sku} · ${p.category.title}`,
      url: `/produkciya/${p.direction.slug}/${p.category.slug}/${p.slug}`,
      image: img,
    })
  }
  for (const c of categories.docs) {
    if (typeof c.direction === 'string') continue
    hits.push({ type: 'category', title: c.title, subtitle: c.direction.title, url: `/produkciya/${c.direction.slug}/${c.slug}`, image: null })
  }
  for (const d of directions.docs) {
    hits.push({ type: 'direction', title: d.title, subtitle: d.shortDescription, url: `/produkciya/${d.slug}`, image: null })
  }
  for (const pr of projects.docs) {
    hits.push({ type: 'project', title: pr.title, subtitle: [pr.city, pr.year].filter(Boolean).join(', '), url: `/obekty/${pr.slug}`, image: null })
  }

  return {
    hits: hits.slice(0, limit),
    total: products.totalDocs + categories.totalDocs + directions.totalDocs + projects.totalDocs,
  }
}

// --- данные для sitemap ---

export async function getSitemapData() {
  const payload = await getPayloadClient()
  const [directions, categories, products, projects, pages] = await Promise.all([
    payload.find({ collection: 'directions', depth: 0, limit: 500, pagination: false, overrideAccess: false }),
    payload.find({ collection: 'categories', depth: 1, limit: 1000, pagination: false, overrideAccess: false }),
    payload.find({ collection: 'products', where: published, depth: 2, limit: 5000, pagination: false, draft: false, overrideAccess: false }),
    payload.find({ collection: 'projects', where: published, depth: 0, limit: 1000, pagination: false, draft: false, overrideAccess: false }),
    payload.find({ collection: 'pages', depth: 0, limit: 50, pagination: false, overrideAccess: false }),
  ])
  return {
    directions: directions.docs,
    categories: categories.docs,
    products: products.docs,
    projects: projects.docs,
    pages: pages.docs,
  }
}
