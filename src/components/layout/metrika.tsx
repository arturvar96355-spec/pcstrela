'use client'

import { useEffect } from 'react'
import { COOKIE_KEY } from './cookie-banner'

// Метрика грузится только после согласия на cookie.
export function Metrika({ id }: { id?: string | null }) {
  useEffect(() => {
    if (!id || !/^\d{6,10}$/.test(id)) return
    const load = () => {
      try {
        if (localStorage.getItem(COOKIE_KEY) !== 'all' || window.__ymId) return
      } catch {
        return
      }
      const counter = Number(id)
      window.__ymId = counter
       
      ;(function (m: any, e: Document, t: string, r: string, i: string) {
        m[i] = m[i] || function () { (m[i].a = m[i].a || []).push(arguments) }
        m[i].l = Date.now()
        const k = e.createElement(t) as HTMLScriptElement
        const a = e.getElementsByTagName(t)[0]
        k.async = true
        k.src = r
        a.parentNode!.insertBefore(k, a)
      })(window, document, 'script', 'https://mc.yandex.ru/metrika/tag.js', 'ym')
       
      ;(window as unknown as { ym: (...a: unknown[]) => void }).ym(counter, 'init', {
        clickmap: true,
        trackLinks: true,
        accurateTrackBounce: true,
        webvisor: true,
      } as never)
    }
    load()
    window.addEventListener('cookie-consent-changed', load)
    return () => window.removeEventListener('cookie-consent-changed', load)
  }, [id])
  return null
}
