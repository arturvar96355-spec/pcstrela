import { sql } from '@payloadcms/db-postgres'
import { fail, ok, requestId } from '@/lib/api'
import { getPayloadClient } from '@/lib/payload'

export const dynamic = 'force-dynamic'

export async function GET() {
  const rid = requestId()
  try {
    const payload = await getPayloadClient()
    const db = (payload.db as unknown as { drizzle: { execute: (q: unknown) => Promise<unknown> } }).drizzle
    await db.execute(sql`SELECT 1`)
    return ok({ status: 'ok', db: 'ok', time: new Date().toISOString(), version: '1.0.0' }, rid)
  } catch (e) {
    console.error(`[health] rid=${rid}`, e)
    return fail(503, 'DB_UNAVAILABLE', 'База данных недоступна', rid)
  }
}
