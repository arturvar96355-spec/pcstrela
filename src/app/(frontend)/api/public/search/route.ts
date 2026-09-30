import { searchSchema } from '@/lib/schemas'
import { clientIp, fail, ok, requestId } from '@/lib/api'
import { rateLimit } from '@/lib/rate-limit'
import { searchAll } from '@/lib/queries'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  const rid = requestId()
  try {
    const rl = rateLimit('search', clientIp(req), 60, 60_000)
    if (!rl.ok) {
      return fail(429, 'RATE_LIMITED', 'Слишком много запросов. Подождите минуту', rid, {
        headers: { 'Retry-After': String(rl.retryAfterSec || 60) },
      })
    }
    const url = new URL(req.url)
    const parsed = searchSchema.safeParse({
      q: url.searchParams.get('q') ?? '',
      limit: url.searchParams.get('limit') ?? undefined,
    })
    if (!parsed.success) {
      const issue = parsed.error.issues[0]
      return fail(400, 'VALIDATION_ERROR', issue.message, rid, { fields: { [String(issue.path[0] ?? 'q')]: issue.message } })
    }
    const { q, limit } = parsed.data
    const { hits, total } = await searchAll(q, limit)
    return ok(hits, rid, 200, { meta: { q, total }, headers: { 'Cache-Control': 'public, max-age=60' } })
  } catch (e) {
    console.error(`[search] rid=${rid}`, e)
    return fail(500, 'INTERNAL_ERROR', 'Поиск временно недоступен', rid)
  }
}
