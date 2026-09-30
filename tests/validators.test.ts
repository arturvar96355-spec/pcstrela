import { describe, expect, it } from 'vitest'
import { isValidInn, normalizeRuPhone, okpd2Validate, SKU_RE } from '../src/lib/validators'
import { slugify } from '../src/hooks/slug'
import { formatDimensions, formatProductionTime, pluralize, truncateWords } from '../src/lib/format'

describe('ИНН', () => {
  it('принимает корректные', () => {
    expect(isValidInn('7707083893')).toBe(true) // Сбербанк
    expect(isValidInn('500100732259')).toBe(true) // ИП
  })
  it('отклоняет неверные', () => {
    expect(isValidInn('7707083894')).toBe(false)
    expect(isValidInn('123')).toBe(false)
    expect(isValidInn('77070838930')).toBe(false)
  })
})

describe('телефон', () => {
  it('нормализует', () => {
    expect(normalizeRuPhone('8 (916) 555-12-34')).toBe('+79165551234')
    expect(normalizeRuPhone('+7 985 975-03-50')).toBe('+79859750350')
    expect(normalizeRuPhone('9165551234')).toBe('+79165551234')
  })
  it('отклоняет', () => {
    expect(normalizeRuPhone('12345')).toBeNull()
    expect(normalizeRuPhone('+1 202 555 0100')).toBeNull()
  })
})

describe('ОКПД2 и артикул', () => {
  it('ОКПД2', () => {
    expect(okpd2Validate('31.01.12.160')).toBe(true)
    expect(okpd2Validate('31.01.12')).toBe(true)
    expect(okpd2Validate('')).toBe(true)
    expect(okpd2Validate('31-01')).not.toBe(true)
  })
  it('артикул', () => {
    expect(SKU_RE.test('СК-014')).toBe(true)
    expect(SKU_RE.test('ск-014')).toBe(false)
    expect(SKU_RE.test('A')).toBe(false)
  })
})

describe('slug', () => {
  it('транслитерирует', () => {
    expect(slugify('Скамейка „Урсула“ 2.0')).toBe('skamejka-ursula-2-0')
    expect(slugify('  Щётка  ')).toBe('shchetka')
  })
})

describe('форматирование', () => {
  it('габариты и сроки', () => {
    expect(formatDimensions(1500, 450, 450)).toBe('1500 × 450 × 450 мм')
    expect(formatDimensions(null, null, null)).toBeNull()
    expect(formatProductionTime(10, 15)).toBe('10–15 рабочих дней')
  })
  it('склонение', () => {
    expect(pluralize(1, 'модель', 'модели', 'моделей')).toBe('модель')
    expect(pluralize(3, 'модель', 'модели', 'моделей')).toBe('модели')
    expect(pluralize(12, 'модель', 'модели', 'моделей')).toBe('моделей')
    expect(pluralize(21, 'модель', 'модели', 'моделей')).toBe('модель')
  })
  it('обрезка по слову', () => {
    const t = truncateWords('слово '.repeat(60), 160)
    expect(t.length).toBeLessThanOrEqual(160)
    expect(t.endsWith('…')).toBe(true)
  })
})
