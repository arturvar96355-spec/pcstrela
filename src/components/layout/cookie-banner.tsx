'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

export const COOKIE_KEY = 'cookie-consent'

export function CookieBanner() {
  const [show, setShow] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => {
      try {
        setShow(!localStorage.getItem(COOKIE_KEY))
      } catch {
        setShow(false)
      }
    }, 0)
    return () => clearTimeout(t)
  }, [])

  if (!show) return null

  const choose = (value: 'all' | 'necessary') => {
    try {
      localStorage.setItem(COOKIE_KEY, value)
    } catch {
      // ignore
    }
    setShow(false)
    window.dispatchEvent(new Event('cookie-consent-changed'))
  }

  return (
    <div role="dialog" aria-label="Cookie" className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-bg p-4 shadow-[0_-2px_12px_rgba(0,0,0,0.12)]">
      <div className="mx-auto flex max-w-[1280px] flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <p className="text-sm">
          Мы используем cookie и Яндекс Метрику, чтобы улучшать сайт. Подробнее — в{' '}
          <Link href="/cookie" className="underline">
            политике cookie
          </Link>
          .
        </p>
        <div className="flex flex-col gap-2 md:flex-row">
          <Button onClick={() => choose('all')}>Принять</Button>
          <Button variant="secondary" onClick={() => choose('necessary')}>
            Только необходимые
          </Button>
        </div>
      </div>
    </div>
  )
}
