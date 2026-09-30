'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Menu, Phone } from 'lucide-react'
import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { useLead } from '@/components/forms/lead-provider'
import { track } from '@/lib/analytics'

type Props = {
  directions: Array<{ slug: string; title: string }>
  about: Array<{ href: string; label: string }>
  phone: { display: string; href: string } | null
  telegramUrl?: string | null
}

export function MobileNav({ directions, about, phone, telegramUrl }: Props) {
  const [open, setOpen] = useState(false)
  const { openLead, pageContext } = useLead()
  const close = () => setOpen(false)

  return (
    <>
      {phone ? (
        <a href={phone.href} aria-label="Позвонить" onClick={() => track('click_phone')} className="grid size-11 place-items-center hover:bg-muted">
          <Phone className="size-5" />
        </a>
      ) : null}
      <button type="button" aria-label="Меню" onClick={() => setOpen(true)} className="grid size-11 place-items-center hover:bg-muted">
        <Menu className="size-5" />
      </button>
      <Modal open={open} onClose={close} title="Меню" side>
        <nav className="space-y-1">
          <details className="border-b border-border">
            <summary className="flex min-h-11 cursor-pointer items-center font-medium">Продукция</summary>
            <ul className="pb-2 pl-3">
              <li>
                <Link onClick={close} href="/produkciya" className="block py-2">
                  Вся продукция
                </Link>
              </li>
              {directions.map((d) => (
                <li key={d.slug}>
                  <Link onClick={close} href={`/produkciya/${d.slug}`} className="block py-2">
                    {d.title}
                  </Link>
                </li>
              ))}
            </ul>
          </details>
          <Link onClick={close} href="/obekty" className="flex min-h-11 items-center border-b border-border font-medium">
            Объекты
          </Link>
          <details className="border-b border-border">
            <summary className="flex min-h-11 cursor-pointer items-center font-medium">О компании</summary>
            <ul className="pb-2 pl-3">
              {about.map((a) => (
                <li key={a.href}>
                  <Link onClick={close} href={a.href} className="block py-2">
                    {a.label}
                  </Link>
                </li>
              ))}
            </ul>
          </details>
          <Link onClick={close} href="/goszakazchikam" className="flex min-h-11 items-center border-b border-border font-medium">
            Госзаказчикам
          </Link>
          <Link onClick={close} href="/kontakty" className="flex min-h-11 items-center border-b border-border font-medium">
            Контакты
          </Link>
        </nav>
        <div className="mt-6 space-y-3">
          {phone ? (
            <a href={phone.href} className="block text-lg font-bold" onClick={() => track('click_phone')}>
              {phone.display}
            </a>
          ) : null}
          {telegramUrl ? (
            <a href={telegramUrl} target="_blank" rel="noopener noreferrer" className="block underline" onClick={() => track('click_telegram')}>
              Telegram
            </a>
          ) : null}
          <Button
            className="w-full"
            onClick={() => {
              close()
              openLead(pageContext ?? { type: 'callback' })
            }}
          >
            Запросить КП
          </Button>
        </div>
      </Modal>
    </>
  )
}
