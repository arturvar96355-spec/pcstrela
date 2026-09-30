import { describe, expect, it } from 'vitest'
import { leadSchema } from '../src/lib/schemas'

const base = {
  type: 'callback',
  name: 'Иван',
  phone: '8 916 555-12-34',
  consent: true,
  consentVersion: '1',
  sourceUrl: 'https://example.ru/',
}
const uuid = '5f1c2a7e-3b0d-4c8a-9f61-2d7e8b4a1c90'

describe('leadSchema', () => {
  it('callback: минимальная заявка', () => {
    const r = leadSchema.safeParse(base)
    expect(r.success).toBe(true)
    if (r.success) expect(r.data.phone).toBe('+79165551234')
  })
  it('требует согласие', () => {
    const r = leadSchema.safeParse({ ...base, consent: false })
    expect(r.success).toBe(false)
  })
  it('quote без изделия и сообщения — ошибка', () => {
    const r = leadSchema.safeParse({ ...base, type: 'quote' })
    expect(r.success).toBe(false)
  })
  it('quote с изделием и количеством', () => {
    const r = leadSchema.safeParse({ ...base, type: 'quote', productId: uuid, quantity: '40' })
    expect(r.success).toBe(true)
    if (r.success) expect(r.data.quantity).toBe(40)
  })
  it('calculation: нужны направление и 20+ символов', () => {
    expect(leadSchema.safeParse({ ...base, type: 'calculation' }).success).toBe(false)
    expect(leadSchema.safeParse({ ...base, type: 'calculation', directionId: uuid, message: 'коротко' }).success).toBe(false)
    expect(
      leadSchema.safeParse({ ...base, type: 'calculation', directionId: uuid, message: 'Нужны тепловые узлы для трёх домов' }).success,
    ).toBe(true)
  })
  it('неверный ИНН и email', () => {
    expect(leadSchema.safeParse({ ...base, inn: '1234567890' }).success).toBe(false)
    expect(leadSchema.safeParse({ ...base, email: 'не-почта' }).success).toBe(false)
  })
  it('сообщение длиннее 2000 — ошибка', () => {
    expect(leadSchema.safeParse({ ...base, message: 'а'.repeat(2001) }).success).toBe(false)
  })
})

describe('leadSchema: пустые значения формы', () => {
  it('пустые productId и directionId считаются не переданными', () => {
    const r = leadSchema.safeParse({ ...base, productId: '', directionId: '', email: '', inn: '', quantity: '' })
    expect(r.success).toBe(true)
  })
})
