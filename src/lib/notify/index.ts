import 'server-only'
import type { Lead, Product, Direction } from '@/payload-types'
import { getPayloadClient } from '../payload'
import { sendEmail } from './email'
import { sendTelegram } from './telegram'

type Channel = 'email' | 'telegram'

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

async function withRetries(fn: () => Promise<void>): Promise<void> {
  const pauses = [2000, 8000]
  for (let i = 0; ; i++) {
    try {
      return await fn()
    } catch (e) {
      if (i >= pauses.length) throw e
      await sleep(pauses[i])
    }
  }
}

// Вызывается из after(): посетитель не ждёт отправки. Заявка уже сохранена в БД.
export async function notifyLead(leadId: string): Promise<void> {
  const payload = await getPayloadClient()
  const lead = await payload.findByID({ collection: 'leads', id: leadId, depth: 1, overrideAccess: true })
  const settings = await payload.findGlobal({ slug: 'site-settings', depth: 0, overrideAccess: true })

  const emails = (settings.notifyEmails ?? []).map((e) => e.email).filter(Boolean)
  const chats = (settings.telegramChatIds ?? []).map((c) => c.chatId).filter(Boolean)

  const result: Record<Channel, 'sent' | 'failed' | 'skipped'> = { email: 'skipped', telegram: 'skipped' }
  const errors: string[] = []

  const run = async (channel: Channel, enabled: boolean, job: () => Promise<void>) => {
    if (!enabled) return
    try {
      await withRetries(job)
      result[channel] = 'sent'
    } catch (e) {
      result[channel] = 'failed'
      errors.push(`${channel}: ${(e as Error).message}`)
      console.error(`[notify] ${channel} failed for lead ${lead.number}:`, (e as Error).message)
    }
  }

  await Promise.all([
    run('email', emails.length > 0 && Boolean(process.env.SMTP_USER), () => sendEmail(emails, lead)),
    run('telegram', chats.length > 0 && Boolean(process.env.TELEGRAM_BOT_TOKEN), () => sendTelegram(chats, lead)),
  ])

  await payload.update({
    collection: 'leads',
    id: leadId,
    overrideAccess: true,
    context: { disableRevalidate: true },
    data: {
      notifications: {
        email: result.email,
        telegram: result.telegram,
        attempts: 1,
        lastError: errors.join('; ').slice(0, 250) || undefined,
      },
    },
  })
}
