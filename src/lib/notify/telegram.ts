import 'server-only'
import type { Lead } from '@/payload-types'
import { leadSummary } from './summary'

export const escapeHtml = (s: string): string =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

export function telegramText(lead: Lead): string {
  const s = leadSummary(lead)
  const lines = [`<b>Заявка №${lead.number} · ${escapeHtml(s.typeLabel)}</b>`]
  const org = [lead.organization, lead.inn ? `ИНН ${lead.inn}` : null].filter(Boolean).join(', ')
  if (org) lines.push(escapeHtml(org))
  lines.push(`👤 ${escapeHtml(lead.name)}`, `📞 ${escapeHtml(lead.phone)}`)
  if (lead.email) lines.push(`✉️ ${escapeHtml(lead.email)}`)
  if (s.product) {
    lines.push(`📦 ${escapeHtml(s.product.title)} (${escapeHtml(s.product.sku)})${lead.quantity ? ` × ${lead.quantity}` : ''}`)
  } else if (s.direction) {
    lines.push(`📦 ${escapeHtml(s.direction.title)}`)
  }
  if (lead.region) lines.push(`📍 ${escapeHtml(lead.region)}`)
  if (lead.message) lines.push(`💬 ${escapeHtml(lead.message)}`)
  lines.push(`🔗 <a href="${escapeHtml(s.adminUrl)}">Открыть в админке</a>`)
  return lines.join('\n').slice(0, 4000)
}

async function sendOne(chatId: string, text: string): Promise<void> {
  const res = await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, parse_mode: 'HTML', disable_web_page_preview: true, text }),
    signal: AbortSignal.timeout(10_000),
  })
  const body = (await res.json().catch(() => null)) as { ok?: boolean; description?: string } | null
  if (!res.ok || !body?.ok) {
    const desc = body?.description ?? `HTTP ${res.status}`
    if (/kicked|not a member/i.test(desc)) console.error('[notify] Проверьте, что бот состоит в группе Telegram')
    throw new Error(desc)
  }
}

export async function sendTelegram(chatIds: string[], lead: Lead): Promise<void> {
  const text = telegramText(lead)
  const results = await Promise.allSettled(chatIds.map((id) => sendOne(id, text)))
  const failed = results.find((r): r is PromiseRejectedResult => r.status === 'rejected')
  if (failed) throw failed.reason
}
