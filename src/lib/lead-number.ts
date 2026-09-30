import { sql } from '@payloadcms/db-postgres'
import type { Payload } from 'payload'

type Drizzle = { execute: (q: unknown) => Promise<{ rows: Array<{ n: string }> }> }

// Номер заявки берётся из последовательности PostgreSQL: без гонок при одновременных заявках.
export async function nextLeadNumber(payload: Payload): Promise<number> {
  const db = (payload.db as unknown as { drizzle: Drizzle }).drizzle
  // на случай, если ручная миграция ещё не применялась (локальная разработка)
  await db.execute(sql`CREATE SEQUENCE IF NOT EXISTS lead_number_seq START WITH 1001`)
  const res = await db.execute(sql`SELECT nextval('lead_number_seq') AS n`)
  return Number(res.rows[0].n)
}
