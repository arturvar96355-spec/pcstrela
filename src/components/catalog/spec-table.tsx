import type { Product } from '@/payload-types'
import { formatDimensions, formatProductionTime, formatWarranty, formatWeight } from '@/lib/format'

export function buildSpecRows(p: Product): Array<[string, string]> {
  const rows: Array<[string, string | null]> = [
    ['Артикул', p.sku],
    ['Габариты', formatDimensions(p.lengthMm, p.widthMm, p.heightMm)],
    ['Масса', formatWeight(p.weightKg)],
    ['Материалы', (p.materials ?? []).map((m) => m.material).join(', ') || null],
    ['Покрытие', p.coating ?? null],
    ['Срок изготовления', formatProductionTime(p.productionDaysMin, p.productionDaysMax)],
    ['Гарантия', formatWarranty(p.warrantyMonths)],
    ['ОКПД2', p.okpd2 ?? null],
  ]
  for (const a of p.attributes ?? []) {
    if (a.value && a.value.trim()) rows.push([a.label ?? '', `${a.value}${a.unit ? ` ${a.unit}` : ''}`])
  }
  return rows.filter((r): r is [string, string] => Boolean(r[1]))
}

export function SpecTable({ rows }: { rows: Array<[string, string]> }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <tbody>
          {rows.map(([k, v]) => (
            <tr key={k} className="border-b border-border">
              <th scope="row" className="w-2/5 py-3 pr-4 text-left font-normal text-muted-fg">
                {k}
              </th>
              <td className="py-3">{v}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
