import type { Media, ProductImage } from '@/payload-types'

type Img = Media | ProductImage

// Payload отдаёт абсолютные URL (с serverURL). На сайте нужны относительные: так работает и next/image.
export const relUrl = (u: string): string => u.replace(/^https?:\/\/[^/]+/, '')
type Size = 'thumb' | 'card' | 'hero'

export type ImageInfo = { url: string; alt: string; width: number; height: number }

// Возвращает нужный размер изображения или оригинал. Строка-id (не раскрытая связь) → null.
export function imageOf(img: string | Img | null | undefined, size: Size = 'card'): ImageInfo | null {
  if (!img || typeof img === 'string') return null
  const s = img.sizes?.[size]
  const url = s?.url ?? img.url
  if (!url) return null
  return {
    url: relUrl(url),
    alt: img.alt ?? '',
    width: s?.width ?? img.width ?? 960,
    height: s?.height ?? img.height ?? 720,
  }
}

export function fileUrl(file: unknown): string | null {
  if (!file || typeof file === 'string') return null
  const u = (file as { url?: string | null }).url
  return u ? relUrl(u) : null
}
