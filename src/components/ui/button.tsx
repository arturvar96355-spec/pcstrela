import Link from 'next/link'
import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { cn } from '@/lib/format'

type Variant = 'primary' | 'secondary' | 'ghost' | 'inverse'

const base =
  'inline-flex min-h-11 items-center justify-center gap-2 rounded-[4px] px-5 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black disabled:opacity-60 disabled:pointer-events-none'

const variants: Record<Variant, string> = {
  primary: 'bg-fg text-bg hover:bg-black/80 border border-fg',
  secondary: 'bg-bg text-fg border border-fg hover:bg-muted',
  ghost: 'text-fg hover:bg-muted',
  inverse: 'bg-inverse-fg text-inverse-bg border border-inverse-fg hover:bg-white/80',
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
