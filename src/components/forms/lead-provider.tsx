'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { Modal } from '@/components/ui/modal'
import { LeadForm, type LeadDirection, type LeadProduct, type LeadType } from './lead-form'
import { Button } from '@/components/ui/button'
import { track } from '@/lib/analytics'

export type LeadOpenOptions = {
  type: LeadType
  product?: LeadProduct | null
  direction?: LeadDirection | null
  message?: string
  hint?: string
}

type Ctx = {
  openLead: (o: LeadOpenOptions) => void
  setPageContext: (o: LeadOpenOptions | null) => void
  pageContext: LeadOpenOptions | null
  config: LeadConfig
}

export type LeadConfig = {
  consentVersion: string
  promise: string
  phone: string
  directions: LeadDirection[]
}

const LeadContext = createContext<Ctx | null>(null)

export function useLead(): Ctx {
  const c = useContext(LeadContext)
  if (!c) throw new Error('useLead вне LeadProvider')
  return c
}

const TITLES: Record<LeadType, string> = {
  callback: 'Обратный звонок',
  quote: 'Запрос коммерческого предложения',
  calculation: 'Запрос расчёта',
}

export function LeadProvider({ config, children }: { config: LeadConfig; children: ReactNode }) {
  const [opts, setOpts] = useState<LeadOpenOptions | null>(null)
  const [pageContext, setPageContext] = useState<LeadOpenOptions | null>(null)
  const [key, setKey] = useState(0)

  const openLead = useCallback((o: LeadOpenOptions) => {
    setKey((k) => k + 1)
    setOpts(o)
    track('open_lead_dialog')
  }, [])

  // UTM: сохраняем при первом входе
  useEffect(() => {
    try {
      if (sessionStorage.getItem('utm')) return
      const params = new URLSearchParams(window.location.search)
      const utm: Record<string, string> = {}
      params.forEach((v, k) => {
        if (k.startsWith('utm_')) utm[k] = v.slice(0, 200)
      })
      if (Object.keys(utm).length) sessionStorage.setItem('utm', JSON.stringify(utm))
    } catch {
      // ignore
    }
  }, [])

  const value = useMemo(() => ({ openLead, setPageContext, pageContext, config }), [openLead, pageContext, config])

  return (
    <LeadContext.Provider value={value}>
      {children}
      <Modal open={Boolean(opts)} onClose={() => setOpts(null)} title={opts ? TITLES[opts.type] : ''}>
        {opts ? (
          <LeadForm
            key={key}
            type={opts.type}
            product={opts.product}
            direction={opts.direction}
            directions={config.directions}
            defaultMessage={opts.message}
            hint={opts.hint}
            consentVersion={config.consentVersion}
            promise={config.promise}
            phone={config.phone}
            onDone={() => setOpts(null)}
            onDropProduct={() => setOpts({ ...opts, type: 'callback', product: null })}
          />
        ) : null}
      </Modal>
    </LeadContext.Provider>
  )
}

// Кнопка, открывающая диалог заявки. Используется из серверных компонентов.
export function LeadButton({
  label,
  className,
  variant = 'primary',
  ...opts
}: LeadOpenOptions & { label: string; className?: string; variant?: 'primary' | 'secondary' | 'ghost' | 'inverse' }) {
  const { openLead } = useLead()
  return (
    <Button variant={variant} className={className} onClick={() => openLead(opts)}>
      {label}
    </Button>
  )
}

// Задаёт контекст для кнопки «Запросить КП» в шапке на конкретной странице.
export function PageLeadContext(opts: LeadOpenOptions) {
  const { setPageContext } = useLead()
  const { type, product, direction, message, hint } = opts
  useEffect(() => {
    setPageContext({ type, product, direction, message, hint })
    return () => setPageContext(null)
  }, [setPageContext, type, product, direction, message, hint])
  return null
}

// Встроенная (не диалоговая) форма заявки.
export function InlineLeadForm({
  type,
  direction,
  hint,
  message,
}: {
  type: LeadType
  direction?: LeadDirection | null
  hint?: string
  message?: string
}) {
  const { config } = useLead()
  return (
    <LeadForm
      type={type}
      direction={direction}
      directions={config.directions}
      hint={hint}
      defaultMessage={message}
      consentVersion={config.consentVersion}
      promise={config.promise}
      phone={config.phone}
    />
  )
}
