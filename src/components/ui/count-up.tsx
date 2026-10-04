'use client'

import { useEffect, useRef, useState } from 'react'

// Число «набегает» от нуля, когда блок попадает в экран. Нечисловые значения показываются как есть.
export function CountUp({ value, className }: { value: string; className?: string }) {
  const match = /^(\D*)(\d[\d\s]*)(.*)$/.exec(value)
  const ref = useRef<HTMLSpanElement>(null)
  const [shown, setShown] = useState<string | null>(null)

  useEffect(() => {
    const el = ref.current
    if (!el || !match) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || !('IntersectionObserver' in window)) return
    const target = Number(match[2].replace(/\s/g, ''))
    const hasSpaces = /\s/.test(match[2])
    let raf = 0
    const fmt = (n: number) => (hasSpaces ? n.toLocaleString('ru-RU') : String(n))
    const io = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return
        io.disconnect()
        const start = performance.now()
        const tick = (t: number) => {
          const k = Math.min(1, (t - start) / 1400)
          const eased = 1 - Math.pow(1 - k, 3)
          setShown(`${match[1]}${fmt(Math.round(target * eased))}${match[3]}`)
          if (k < 1) raf = requestAnimationFrame(tick)
        }
        raf = requestAnimationFrame(tick)
      },
      { threshold: 0.4 },
    )
    io.observe(el)
    return () => {
      io.disconnect()
      cancelAnimationFrame(raf)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])

  return (
    <span ref={ref} className={className}>
      {shown ?? value}
    </span>
  )
}
