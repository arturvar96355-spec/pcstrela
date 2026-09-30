import { APIError, type CollectionBeforeChangeHook } from 'payload'

const idOf = (v: unknown): string | undefined =>
  typeof v === 'object' && v !== null ? (v as { id: string }).id : (v as string | undefined)

// 1) проверяет, что категория принадлежит направлению
// 2) приводит строки attributes к набору категории (добавляет недостающие, удаляет лишние, сохраняет введённые значения)
// 3) при публикации требует заполнить обязательные характеристики
// 4) подставляет ОКПД2 категории, если у товара он пустой
export const syncAttributes: CollectionBeforeChangeHook = async ({ data, req }) => {
  const categoryId = idOf(data.category)
  if (!categoryId) return data

  const category = await req.payload.findByID({ collection: 'categories', id: categoryId, depth: 0, req })
  if (idOf(category.direction) !== idOf(data.direction)) {
    throw new APIError('Категория не относится к выбранному направлению', 400)
  }

  const current: Array<{ key: string; value?: string }> = data.attributes ?? []
  const set = category.attributeSet ?? []
  data.attributes = set.map((a) => ({
    key: a.key,
    label: a.label,
    unit: a.unit ?? '',
    value: current.find((c) => c.key === a.key)?.value ?? '',
  }))

  if (data._status === 'published') {
    const missing = set.find(
      (a) =>
        a.required &&
        !(data.attributes as Array<{ key: string; value: string }>).find((x) => x.key === a.key)?.value?.trim(),
    )
    if (missing) throw new APIError(`Заполните характеристику «${missing.label}»`, 400)
  }

  if (!data.okpd2 && category.okpd2) data.okpd2 = category.okpd2
  return data
}
