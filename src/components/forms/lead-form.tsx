'use client'

import { useEffect, useRef, useState } from 'react'
import { useForm, type FieldErrors } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { AlertCircle, CheckCircle2, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { leadSchema } from '@/lib/schemas'
import { track } from '@/lib/analytics'
import { cn } from '@/lib/format'
import { Button } from '@/components/ui/button'

export type LeadType = 'callback' | 'quote' | 'calculation'

export type LeadProduct = { id: string; title: string; sku: string }
export type LeadDirection = { id: string; title: string }

export type LeadFormProps = {
  type: LeadType
  product?: LeadProduct | null
  direction?: LeadDirection | null
  directions?: LeadDirection[]
  defaultMessage?: string
  hint?: string
  consentVersion: string
  promise: string
  phone?: string
  onDone?: () => void
  doneLabel?: string
  onDropProduct?: () => void
}

type FormValues = {
  type: LeadType
  name: string
  phone: string
  email: string
  organization: string
  inn: string
  region: string
  productId?: string
  directionId?: string
  quantity: string
  message: string
  consent: boolean
  consentVersion: string
  sourceUrl: string
  website: string
}

const inputCls =
  'min-h-11 w-full rounded-[4px] border border-border bg-bg px-3 text-base outline-none focus:border-fg aria-[invalid=true]:border-danger'

function formatPhoneInput(raw: string): string {
  let d = raw.replace(/\D/g, '')
  if (d.startsWith('8')) d = `7${d.slice(1)}`
  if (!d.startsWith('7')) d = `7${d}`
  d = d.slice(0, 11)
  const p = d.slice(1)
  let out = '+7'
  if (p.length > 0) out += ` (${p.slice(0, 3)}`
  if (p.length >= 3) out += ')'
  if (p.length > 3) out += ` ${p.slice(3, 6)}`
  if (p.length > 6) out += `-${p.slice(6, 8)}`
  if (p.length > 8) out += `-${p.slice(8, 10)}`
  return out
}

function readUtm(): Record<string, string> | undefined {
  try {
    const raw = sessionStorage.getItem('utm')
    return raw ? (JSON.parse(raw) as Record<string, string>) : undefined
  } catch {
    return undefined
  }
}

function Field({ label, error, required, children }: { label: string; error?: string; required?: boolean; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium">
        {label}
        {required ? ' *' : ''}
      </span>
      {children}
      {error ? (
        <span role="alert" className="mt-1 block text-sm text-danger">
          {error}
        </span>
      ) : null}
    </label>
  )
}

export function LeadForm(props: LeadFormProps) {
  const { type, product, direction, directions = [], consentVersion, promise, phone, onDone, doneLabel } = props
  const draftKey = `lead-draft-${type}`
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success'>('idle')
  const [serverError, setServerError] = useState<string | null>(null)
  const [productGone, setProductGone] = useState(false)
  const [number, setNumber] = useState<number | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const {
    register,
    handleSubmit,
    setValue,
    setFocus,
    watch,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(leadSchema as any) as any,
    mode: 'onTouched',
    defaultValues: {
      type,
      name: '',
      phone: '',
      email: '',
      organization: '',
      inn: '',
      region: '',
      productId: product?.id,
      directionId: direction?.id ?? '',
      quantity: '',
      message: props.defaultMessage ?? '',
      consent: false,
      consentVersion,
      sourceUrl: '',
      website: '',
    },
  })

  // восстановление черновика
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(draftKey)
      if (raw) {
        const saved = JSON.parse(raw) as Partial<FormValues>
        for (const [k, v] of Object.entries(saved)) {
          if (k === 'productId' || k === 'directionId' || k === 'type' || k === 'consent' || k === 'consentVersion' || k === 'website') continue
          if (typeof v === 'string' && v) setValue(k as keyof FormValues, v as never)
        }
      }
    } catch {
      // sessionStorage может быть недоступен
    }
  }, [draftKey, setValue])

  // сохранение черновика с задержкой 500 мс
  useEffect(() => {
    const sub = watch((values) => {
      if (saveTimer.current) clearTimeout(saveTimer.current)
      saveTimer.current = setTimeout(() => {
        try {
          const { consent: _c, website: _w, ...rest } = values as FormValues
          void _c
          void _w
          sessionStorage.setItem(draftKey, JSON.stringify(rest))
        } catch {
          // ignore
        }
      }, 500)
    })
    return () => {
      sub.unsubscribe()
      if (saveTimer.current) clearTimeout(saveTimer.current)
    }
  }, [watch, draftKey])

  const onInvalid = (errs: FieldErrors<FormValues>) => {
    const first = Object.keys(errs)[0] as keyof FormValues | undefined
    if (first) setFocus(first)
  }

  const onSubmit = async (values: FormValues) => {
    setServerError(null)
    setStatus('submitting')
    try {
      const res = await fetch('/api/public/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(15_000),
        body: JSON.stringify({
          ...values,
          type,
          productId: productGone ? undefined : (product?.id ?? undefined),
          directionId: values.directionId || direction?.id || undefined,
          quantity: values.quantity === '' ? undefined : Number(values.quantity),
          consentVersion,
          sourceUrl: window.location.href,
          utm: readUtm(),
        }),
      })
      const json = (await res.json().catch(() => null)) as {
        data?: { number: number | null; message?: string }
        error?: { code: string; message: string; fields?: Record<string, string> }
      } | null

      if (res.ok && json?.data) {
        try {
          sessionStorage.removeItem(draftKey)
        } catch {
          // ignore
        }
        setNumber(json.data.number)
        setSuccessMessage(json.data.message ?? null)
        setStatus('success')
        track(`lead_${type}` as 'lead_quote')
        return
      }

      setStatus('idle')
      if (json?.error?.code === 'PRODUCT_NOT_FOUND') setProductGone(true)
      if (json?.error?.fields) {
        const first = Object.keys(json.error.fields)[0]
        if (first && first in values) setFocus(first as keyof FormValues)
      }
      setServerError(json?.error?.message ?? 'Не удалось отправить. Проверьте интернет и попробуйте ещё раз')
    } catch (e) {
      setStatus('idle')
      const timeout = e instanceof DOMException && (e.name === 'TimeoutError' || e.name === 'AbortError')
      setServerError(
        timeout
          ? `Сервер отвечает слишком долго. Попробуйте ещё раз${phone ? ` или позвоните: ${phone}` : ''}`
          : 'Не удалось отправить. Проверьте интернет и попробуйте ещё раз',
      )
    }
  }

  if (status === 'success') {
    return (
      <div className="py-6 text-center" role="status">
        <CheckCircle2 className="mx-auto size-12 text-success" />
        <p className="mt-3 font-display text-xl font-bold">
          {number ? `Заявка №${number} принята` : 'Заявка принята'}
        </p>
        <p className="mt-2 text-muted-fg">{successMessage?.replace(/^Заявка №\d+ (уже )?принята\.\s*/, '') || promise}</p>
        <Button
          className="mt-5"
          variant="secondary"
          onClick={() => {
            if (onDone) onDone()
            else {
              reset()
              setStatus('idle')
            }
          }}
        >
          {doneLabel ?? (onDone ? 'Закрыть' : 'Отправить ещё одну')}
        </Button>
      </div>
    )
  }

  const submitting = status === 'submitting'
  const showProduct = type === 'quote' && product && !productGone
  const message = watch('message') ?? ''
  const messageRequired = type === 'calculation' || (type === 'quote' && (!product || productGone))

  return (
    <form onSubmit={handleSubmit(onSubmit, onInvalid)} noValidate className="space-y-4">
      {props.hint ? <p className="text-sm text-muted-fg">{props.hint}</p> : null}

      {showProduct ? (
        <Field label="Изделие">
          <input className={cn(inputCls, 'bg-muted')} disabled value={`${product.title} (${product.sku})`} readOnly />
        </Field>
      ) : null}

      {type === 'calculation' && !direction ? (
        <Field label="Направление" required error={errors.directionId?.message}>
          <select className={inputCls} disabled={submitting} aria-invalid={Boolean(errors.directionId)} {...register('directionId')}>
            <option value="">Выберите направление</option>
            {directions.map((d) => (
              <option key={d.id} value={d.id}>
                {d.title}
              </option>
            ))}
          </select>
        </Field>
      ) : null}

      <Field label="Имя" required error={errors.name?.message}>
        <input className={inputCls} autoComplete="name" disabled={submitting} aria-invalid={Boolean(errors.name)} {...register('name')} />
      </Field>

      <Field label="Телефон" required error={errors.phone?.message}>
        <input
          className={inputCls}
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          placeholder="+7 (___) ___-__-__"
          disabled={submitting}
          aria-invalid={Boolean(errors.phone)}
          {...register('phone', { onChange: (e) => setValue('phone', formatPhoneInput(e.target.value)) })}
        />
      </Field>

      {type !== 'callback' ? (
        <Field label="Email" error={errors.email?.message}>
          <input className={inputCls} type="email" autoComplete="email" disabled={submitting} aria-invalid={Boolean(errors.email)} {...register('email')} />
        </Field>
      ) : null}

      <Field label="Организация" error={errors.organization?.message}>
        <input className={inputCls} autoComplete="organization" disabled={submitting} {...register('organization')} />
      </Field>

      {type !== 'callback' ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="ИНН" error={errors.inn?.message}>
            <input className={inputCls} inputMode="numeric" maxLength={12} disabled={submitting} aria-invalid={Boolean(errors.inn)} {...register('inn')} />
          </Field>
          <Field label="Регион поставки" error={errors.region?.message}>
            <input className={inputCls} disabled={submitting} {...register('region')} />
          </Field>
        </div>
      ) : null}

      {showProduct ? (
        <Field label="Количество" error={errors.quantity?.message}>
          <input className={inputCls} type="number" min={1} inputMode="numeric" disabled={submitting} aria-invalid={Boolean(errors.quantity)} {...register('quantity')} />
        </Field>
      ) : null}

      <Field
        label={type === 'calculation' ? 'Описание задачи' : 'Сообщение'}
        required={messageRequired}
        error={errors.message?.message}
      >
        <textarea
          className={cn(inputCls, 'min-h-28 py-2')}
          maxLength={2000}
          disabled={submitting}
          aria-invalid={Boolean(errors.message)}
          {...register('message')}
        />
        <span className="mt-1 block text-right text-xs text-muted-fg">{message.length} / 2000</span>
      </Field>

      {/* honeypot */}
      <div aria-hidden className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <input tabIndex={-1} autoComplete="off" {...register('website')} />
      </div>

      <div>
        <label className="flex items-start gap-3 text-sm">
          <input type="checkbox" className="mt-0.5 size-5 shrink-0 accent-black" disabled={submitting} aria-invalid={Boolean(errors.consent)} {...register('consent')} />
          <span>
            Я даю{' '}
            <Link href="/soglasie-na-obrabotku" target="_blank" className="underline">
              согласие на обработку персональных данных
            </Link>{' '}
            в соответствии с{' '}
            <Link href="/politika-konfidencialnosti" target="_blank" className="underline">
              политикой
            </Link>
            *
          </span>
        </label>
        {errors.consent ? (
          <span role="alert" className="mt-1 block text-sm text-danger">
            {errors.consent.message}
          </span>
        ) : null}
      </div>

      {serverError ? (
        <div role="alert" className="flex items-start gap-2 rounded-[4px] border border-danger p-3 text-sm text-danger">
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          <div>
            {serverError}
            {productGone && props.onDropProduct ? (
              <button type="button" className="mt-1 block underline" onClick={props.onDropProduct}>
                Отправить заявку без изделия
              </button>
            ) : null}
          </div>
        </div>
      ) : null}

      <Button type="submit" className="w-full" disabled={submitting}>
        {submitting ? (
          <>
            <Loader2 className="size-4 animate-spin" /> Отправляем…
          </>
        ) : (
          'Отправить'
        )}
      </Button>
    </form>
  )
}
