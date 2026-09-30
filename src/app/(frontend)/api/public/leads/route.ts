import { createHash } from 'node:crypto'
import { after } from 'next/server'
import { leadSchema } from '@/lib/schemas'
import { clientIp, fail, ok, requestId } from '@/lib/api'
import { rateLimit } from '@/lib/rate-limit'
import { getPayloadClient } from '@/lib/payload'
import { nextLeadNumber } from '@/lib/lead-number'
import { notifyLead } from '@/lib/notify'
import { formatPhone } from '@/lib/format'
import type { Lead } from '@/payload-types'

export const dynamic = 'force-dynamic'

async function primaryPhone(): Promise<string> {
  try {
    const payload = await getPayloadClient()
    const s = await payload.findGlobal({ slug: 'site-settings', depth: 0, overrideAccess: true })
    const phones = s.phones ?? []
    const p = phones.find((x) => x.primary) ?? phones[0]
    return p ? formatPhone(p.number) : ''
  } catch {
    return ''
  }
}

export async function POST(req: Request) {
  const rid = requestId()
  try {
    // 0. Origin
    const origin = req.headers.get('origin')
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL
    if (origin && siteUrl && origin !== new URL(siteUrl).origin) {
      return fail(403, 'FORBIDDEN_ORIGIN', 'Запрос отклонён', rid)
    }

    // 1–2. IP и rate limit
    const ip = clientIp(req)
    const rl = rateLimit('leads', ip, 5, 600_000)
    if (!rl.ok) {
      console.warn(`[leads] rate limited ip=${ip} rid=${rid}`)
      const phone = await primaryPhone()
      return fail(
        429,
        'RATE_LIMITED',
        `Слишком много заявок подряд. Попробуйте через 10 минут${phone ? ` или позвоните: ${phone}` : ''}`,
        rid,
        { headers: { 'Retry-After': String(rl.retryAfterSec || 600) } },
      )
    }

    // 3. JSON
    let body: unknown
    try {
      body = await req.json()
    } catch {
      return fail(400, 'INVALID_JSON', 'Некорректный запрос', rid)
    }

    // 4. honeypot: бот не должен понять, что его отсекли
    if (typeof (body as { website?: unknown })?.website === 'string' && (body as { website: string }).website !== '') {
      return ok({ number: null }, rid, 201)
    }

    // 5. валидация
    const parsed = leadSchema.safeParse(body)
    if (!parsed.success) {
      const fields: Record<string, string> = {}
      for (const issue of parsed.error.issues) {
        const key = issue.path.join('.') || '_'
        if (!fields[key]) fields[key] = issue.message
      }
      return fail(400, 'VALIDATION_ERROR', 'Проверьте выделенные поля', rid, { fields })
    }
    const d = parsed.data

    const payload = await getPayloadClient()
    const settings = await payload.findGlobal({ slug: 'site-settings', depth: 0, overrideAccess: true })
    const promise = settings.responseTimePromise || 'Ответим в рабочее время в течение 1 часа'

    // 7. товар и направление
    let productTitle: string | null = null
    let directionId = d.directionId
    if (d.productId) {
      const res = await payload.find({
        collection: 'products',
        where: { and: [{ id: { equals: d.productId } }, { _status: { equals: 'published' } }] },
        depth: 0,
        limit: 1,
        draft: false,
        overrideAccess: true,
      })
      const product = res.docs[0]
      if (!product) {
        return fail(404, 'PRODUCT_NOT_FOUND', 'Изделие не найдено. Возможно, оно снято с публикации', rid)
      }
      productTitle = `Изделие: ${product.title}, арт. ${product.sku}`
      if (!directionId) directionId = typeof product.direction === 'string' ? product.direction : product.direction.id
    }
    if (d.directionId) {
      const found = await payload.find({
        collection: 'directions',
        where: { id: { equals: d.directionId } },
        depth: 0,
        limit: 1,
        overrideAccess: true,
      })
      if (!found.docs[0]) return fail(404, 'DIRECTION_NOT_FOUND', 'Направление не найдено', rid)
    }

    // 8. дедупликация за 60 секунд
    const dedupeKey = createHash('sha256')
      .update([d.phone, d.type, d.productId ?? '', d.directionId ?? '', (d.message ?? '').slice(0, 200)].join('|'))
      .digest('hex')
    const dup = await payload.find({
      collection: 'leads',
      where: {
        and: [{ dedupeKey: { equals: dedupeKey } }, { createdAt: { greater_than: new Date(Date.now() - 60_000).toISOString() } }],
      },
      depth: 0,
      limit: 1,
      overrideAccess: true,
    })
    if (dup.docs[0]) {
      const n = dup.docs[0].number
      return ok({ number: n, message: `Заявка №${n} уже принята. ${promise}`, duplicate: true }, rid, 200)
    }

    // 9. сохранение
    const number = await nextLeadNumber(payload)
    const message = [productTitle, d.message].filter(Boolean).join('\n') || undefined
    const hasEmail = (settings.notifyEmails ?? []).length > 0 && Boolean(process.env.SMTP_USER)
    const hasTelegram = (settings.telegramChatIds ?? []).length > 0 && Boolean(process.env.TELEGRAM_BOT_TOKEN)
    const leadData: Omit<Lead, 'id' | 'createdAt' | 'updatedAt'> = {
        number,
        type: d.type,
        status: 'new',
        name: d.name,
        phone: d.phone,
        email: d.email,
        organization: d.organization,
        inn: d.inn,
        region: d.region,
        product: d.productId,
        direction: directionId,
        quantity: d.quantity,
        message,
        sourceUrl: d.sourceUrl,
        utm: d.utm as Record<string, unknown> | undefined,
        consentAt: new Date().toISOString(),
        consentVersion: d.consentVersion,
        ip,
        userAgent: (req.headers.get('user-agent') ?? '').slice(0, 300),
        dedupeKey,
        notifications: {
          email: hasEmail ? 'pending' : 'skipped',
          telegram: hasTelegram ? 'pending' : 'skipped',
          attempts: 0,
        },
    }
    const lead = await payload.create({
      collection: 'leads',
      overrideAccess: true,
      context: { disableRevalidate: true },
      data: leadData,
    })

    // 10. уведомления после ответа
    after(() =>
      notifyLead(lead.id).catch((e) => console.error(`[leads] notify failed lead=${lead.id} rid=${rid}`, e)),
    )

    // 11.
    return ok({ number, message: `Заявка №${number} принята. ${promise}` }, rid, 201)
  } catch (e) {
    console.error(`[leads] rid=${rid}`, e)
    const phone = await primaryPhone()
    return fail(500, 'INTERNAL_ERROR', `Не удалось отправить заявку.${phone ? ` Позвоните нам: ${phone}` : ''}`, rid)
  }
}
