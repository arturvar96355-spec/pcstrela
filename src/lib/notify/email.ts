import 'server-only'
import type { Lead } from '@/payload-types'
import { getPayloadClient } from '../payload'
import { leadSummary } from './summary'

const esc = (s: string): string =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

function row(label: string, value: string | null | undefined): string {
  if (!value) return ''
  return `<tr><td style="padding:6px 12px;color:#6b6b6b;white-space:nowrap">${esc(label)}</td><td style="padding:6px 12px">${value}</td></tr>`
}

export function leadEmailHtml(lead: Lead): string {
  const s = leadSummary(lead)
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? ''
  const product = s.product
    ? `<a href="${esc(`${site}/produkciya`)}">${esc(s.product.title)}</a> (арт. ${esc(s.product.sku)})`
    : null
  const utm = lead.utm ? esc(JSON.stringify(lead.utm)) : null
  return `<!doctype html><html><body style="font-family:Arial,sans-serif;font-size:14px;color:#111">
<h2 style="margin:0 0 12px">Заявка №${lead.number} · ${esc(s.typeLabel)}</h2>
<table style="border-collapse:collapse">
${row('Дата (МСК)', esc(s.date))}
${row('Имя', esc(lead.name))}
${row('Телефон', `<a href="tel:${esc(lead.phone)}">${esc(lead.phone)}</a>`)}
${row('Email', lead.email ? `<a href="mailto:${esc(lead.email)}">${esc(lead.email)}</a>` : null)}
${row('Организация', lead.organization ? esc(lead.organization) : null)}
${row('ИНН', lead.inn ? esc(lead.inn) : null)}
${row('Регион', lead.region ? esc(lead.region) : null)}
${row('Изделие', product)}
${row('Направление', s.direction ? esc(s.direction.title) : null)}
${row('Количество', lead.quantity ? String(lead.quantity) : null)}
${row('Сообщение', lead.message ? esc(lead.message).replace(/\n/g, '<br>') : null)}
${row('Страница', lead.sourceUrl ? esc(lead.sourceUrl) : null)}
${row('UTM', utm)}
</table>
<p><a href="${esc(s.adminUrl)}">Открыть в админке</a></p>
</body></html>`
}

export async function sendEmail(to: string[], lead: Lead): Promise<void> {
  const payload = await getPayloadClient()
  const s = leadSummary(lead)
  await payload.sendEmail({
    to,
    subject: s.subject,
    html: leadEmailHtml(lead),
    ...(lead.email ? { replyTo: lead.email } : {}),
  })
}
