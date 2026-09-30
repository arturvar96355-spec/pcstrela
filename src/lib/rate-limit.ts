const buckets = new Map<string, number[]>()

// Лимит в памяти процесса (одна инстанция приложения).
export function rateLimit(
  scope: string,
  key: string,
  limit: number,
  windowMs: number,
): { ok: boolean; retryAfterSec: number } {
  const now = Date.now()
  const id = `${scope}:${key}`
  const hits = (buckets.get(id) ?? []).filter((t) => now - t < windowMs)
  if (hits.length >= limit) {
    return { ok: false, retryAfterSec: Math.ceil((windowMs - (now - hits[0])) / 1000) }
  }
  hits.push(now)
  buckets.set(id, hits)
  if (buckets.size > 10_000) buckets.clear() // защита памяти от флуда уникальными IP
  return { ok: true, retryAfterSec: 0 }
}
