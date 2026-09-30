import { z } from 'zod'
import { isValidInn, normalizeRuPhone } from './validators'

// пустая строка из формы (например, невыбранный select) равна «не передано»
const optUuid = z.preprocess((v) => (v === '' ? undefined : v), z.string().uuid().optional())

const optText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => (v ? v : undefined))

// Одна схема на клиенте и на сервере.
export const leadSchema = z
  .object({
    type: z.enum(['callback', 'quote', 'calculation']),
    name: z.string().trim().min(2, 'Введите имя').max(80, 'Не больше 80 символов'),
    phone: z.string().trim().transform((v, ctx) => {
      const n = normalizeRuPhone(v)
      if (!n) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Введите телефон в формате +7 900 000-00-00' })
        return z.NEVER
      }
      return n
    }),
    email: z
      .union([z.literal(''), z.string().trim().email('Неверный email').max(120)])
      .optional()
      .transform((v) => (v ? v : undefined)),
    organization: optText(150),
    inn: optText(12).refine((v) => !v || isValidInn(v), 'Неверный ИНН'),
    region: optText(100),
    productId: optUuid,
    directionId: optUuid,
    quantity: z
      .union([z.literal(''), z.coerce.number().int('Целое число').min(1, 'Минимум 1').max(100000, 'Не больше 100 000')])
      .optional()
      .transform((v) => (v === '' ? undefined : v)),
    message: optText(2000),
    consent: z.literal(true, { errorMap: () => ({ message: 'Нужно согласие на обработку персональных данных' }) }),
    consentVersion: z.string().min(1).max(20),
    sourceUrl: z.string().url().max(500),
    utm: z.record(z.string().max(200)).optional(),
    website: z.string().max(0).optional(), // honeypot: у людей всегда пустое
  })
  .superRefine((d, ctx) => {
    if (d.type === 'quote' && !d.productId && !d.message) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['message'], message: 'Укажите изделие или опишите запрос' })
    }
    if (d.type === 'calculation') {
      if (!d.directionId) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['directionId'], message: 'Выберите направление' })
      }
      if (!d.message || d.message.length < 20) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['message'], message: 'Опишите задачу — минимум 20 символов' })
      }
    }
  })

export type LeadInput = z.infer<typeof leadSchema>

export const searchSchema = z.object({
  q: z.string().trim().min(2, 'Минимум 2 символа').max(60),
  limit: z.coerce.number().int().min(1).max(20).default(8),
})
