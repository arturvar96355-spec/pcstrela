// ИНН: 10 цифр (юрлицо) или 12 (ИП/физлицо), с проверкой контрольных сумм
export function isValidInn(inn: string): boolean {
  if (!/^\d{10}$|^\d{12}$/.test(inn)) return false
  const d = inn.split('').map(Number)
  const check = (weights: number[]) => (weights.reduce((sum, w, i) => sum + w * d[i], 0) % 11) % 10
  if (d.length === 10) return check([2, 4, 10, 3, 5, 9, 4, 6, 8]) === d[9]
  return (
    check([7, 2, 4, 10, 3, 5, 9, 4, 6, 8]) === d[10] &&
    check([3, 7, 2, 4, 10, 3, 5, 9, 4, 6, 8]) === d[11]
  )
}

// Телефон РФ → +7XXXXXXXXXX или null
export function normalizeRuPhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, '')
  if (digits.length === 11 && (digits[0] === '7' || digits[0] === '8')) return `+7${digits.slice(1)}`
  if (digits.length === 10 && digits[0] === '9') return `+7${digits}`
  return null
}

// ОКПД2: 25.99, 31.01.12, 31.01.12.160
export const OKPD2_RE = /^\d{2}\.\d{1,2}(\.\d{1,2})?(\.\d{3})?$/
export const SKU_RE = /^[A-ZА-ЯЁ0-9][A-ZА-ЯЁ0-9.\-]{1,29}$/
export const ATTR_KEY_RE = /^[a-z][a-z0-9_]{1,39}$/

// валидатор для полей ОКПД2 в Payload
export const okpd2Validate = (v: unknown): true | string =>
  v == null || v === '' || (typeof v === 'string' && OKPD2_RE.test(v)) ? true : 'Формат ОКПД2: 31.01.12.160'
