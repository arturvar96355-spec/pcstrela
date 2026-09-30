'use client'

import { Button } from '@/components/ui/button'
import { useLead } from '@/components/forms/lead-provider'

// Контекст задаёт страница: на карточке товара — quote, на услуге — calculation, иначе callback.
export function HeaderCta() {
  const { openLead, pageContext } = useLead()
  return (
    <div className="hidden sm:block">
      <Button onClick={() => openLead(pageContext ?? { type: 'callback' })}>Запросить КП</Button>
    </div>
  )
}
