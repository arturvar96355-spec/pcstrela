import { NextResponse } from 'next/server'

export function requestId(): string {
  return crypto.randomUUID()
}

export function ok(data: unknown, rid: string, status = 200, extra?: { meta?: unknown; headers?: Record<string, string> }) {
  return NextResponse.json(extra?.meta ? { data, meta: extra.meta } : { data }, {
    status,
    headers: { 'X-Request-Id': rid, ...(extra?.headers ?? {}) },
  })
}

export function fail(
  status: number,
  code: string,
  message: string,
  rid: string,
  extra?: { fields?: Record<string, string>; headers?: Record<string, string> },
) {
  return NextResponse.json(
    { error: { code, message, ...(extra?.fields ? { fields: extra.fields } : {}) } },
    { status, headers: { 'X-Request-Id': rid, ...(extra?.headers ?? {}) } },
  )
}

export function clientIp(req: Request): string {
  const real = req.headers.get('x-real-ip')
  if (real) return real.trim()
  const fwd = req.headers.get('x-forwarded-for')
  if (fwd) return fwd.split(',')[0].trim()
  return '0.0.0.0'
}
