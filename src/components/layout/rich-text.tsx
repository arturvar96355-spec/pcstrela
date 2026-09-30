import { RichText as PayloadRichText } from '@payloadcms/richtext-lexical/react'
import type { SerializedEditorState } from '@payloadcms/richtext-lexical/lexical'

// Единственный способ вывода richText: без dangerouslySetInnerHTML.
export function RichText({ data, className }: { data?: unknown; className?: string }) {
  if (!data || typeof data !== 'object') return null
  return (
    <PayloadRichText
      data={data as SerializedEditorState}
      className={`prose-content ${className ?? ''}`}
    />
  )
}

export function hasRichText(data: unknown): boolean {
  const root = (data as { root?: { children?: Array<{ children?: unknown[] }> } } | null)?.root
  return Boolean(root?.children?.some((c) => (c.children?.length ?? 0) > 0))
}
