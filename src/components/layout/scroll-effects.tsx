'use client'

import { useEffect, useRef } from 'react'

// Тень у шапки после прокрутки и тонкая полоса прогресса сверху.
export function ScrollEffects() {
  const bar = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const root = document.documentElement
    let raf = 0
    const update = () => {
      raf = 0
      const y = window.scrollY
      if (y > 8) root.setAttribute('data-scrolled', '')
      else root.removeAttribute('data-scrolled')
      const max = root.scrollHeight - window.innerHeight
      bar.current?.style.setProperty('--p', String(max > 0 ? Math.min(1, y / max) : 0))
    }
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update)
    }
    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      cancelAnimationFrame(raf)
      root.removeAttribute('data-scrolled')
    }
  }, [])

  return <div ref={bar} className="scroll-progress" aria-hidden />
}
