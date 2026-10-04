import Link from 'next/link'
import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { cn } from '@/lib/format'

type Variant = 'primary' | 'secondary' | 'ghost' | 'inverse' | 'accent' | 'outline-light'

const base =
  'inline-flex min-h-11 items-center justify-center gap-2 rounded-[4px] px-5 text-sm font-medium transition-all duration-200 active:translate-y-px focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-60 disabled:pointer-events-none'

const variants: Record<Variant, string> = {
  primary: 'bg-fg text-bg border border-fg hover:bg-accent hover:border-accent hover:shadow-[0_8px_20px_-8px_rgb(242_106_27/.7)]',
  secondary: 'bg-transparent text-fg border border-fg hover:bg-fg hover:text-bg',
  ghost: 'text-fg hover:bg-muted',
  accent: 'bg-accent text-white border border-accent hover:bg-accent-dark hover:border-accent-dark hover:shadow-[0_10px_24px_-8px_rgb(242_106_27/.8)]',
  'outline-light': 'bg-transparent text-white border border-white/60 hover:bg-white hover:text-ink',
  inverse: 'bg-inverse-fg text-inverse-bg border border-inverse-fg hover:bg-accent hover:border-accent hover:text-white',
}

export function buttonClass(variant: Variant = 'primary', className?: string): string {
  return cn(base, variants[variant], className)
}

type Props = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }

export function Button({ variant = 'primary', className, type = 'button', ...rest }: Props) {
  return <button type={type} className={buttonClass(variant, className)} {...rest} />
}

export function LinkButton({
  href,
  variant = 'primary',
  className,
  children,
  external,
  ...rest
}: {
  href: string
  variant?: Variant
  className?: string
  children: ReactNode
  external?: boolean
} & Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, 'href'>) {
  if (external || /^(tel:|mailto:|https?:)/.test(href)) {
    return (
      <a href={href} className={buttonClass(variant, className)} {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})} {...rest}>
        {children}
      </a>
    )
  }
  return (
    <Link href={href} className={buttonClass(variant, className)} {...rest}>
      {children}
    </Link>
  )
}
