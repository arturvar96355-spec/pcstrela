import Link from 'next/link'
import Image from 'next/image'
import { Phone } from 'lucide-react'
import type { Direction, SiteSetting } from '@/payload-types'
import { primaryPhone, NAV_ABOUT } from '@/lib/site'
import { imageOf } from '@/lib/media'
import { SearchButton } from './search-dialog'
import { MobileNav } from './mobile-nav'
import { HeaderCta } from './header-cta'
import { Container } from '@/components/ui/misc'

const linkCls = 'nav-link inline-flex min-h-11 items-center px-3 text-sm font-medium'

export function Header({ settings, directions }: { settings: SiteSetting; directions: Direction[] }) {
  const phone = primaryPhone(settings)
  const logo = imageOf(settings.logo, 'thumb')

  return (
    <header className="site-header sticky top-0 z-30 border-b border-border">
      <Container className="flex h-16 items-center justify-between gap-2">
        <Link href="/" className="flex shrink-0 items-center gap-3" aria-label={settings.companyName}>
          {logo ? (
            <Image src={logo.url} alt={settings.companyName} width={logo.width} height={logo.height} className="h-9 w-auto" priority />
          ) : (
            <span>
              <span className="block font-display text-xl font-bold leading-tight">{settings.companyName}</span>
              {settings.tagline ? <span className="block text-xs leading-tight text-muted-fg">{settings.tagline}</span> : null}
            </span>
          )}
        </Link>

        <nav aria-label="Главное меню" className="hidden items-center lg:flex">
          <div className="group relative">
            <Link href="/produkciya" className={linkCls}>
              Продукция
            </Link>
            <div className="invisible absolute left-0 top-full z-40 w-[640px] border border-border bg-bg p-4 translate-y-2 opacity-0 shadow-xl transition duration-200 group-focus-within:visible group-focus-within:translate-y-0 group-focus-within:opacity-100 group-hover:visible group-hover:translate-y-0 group-hover:opacity-100">
              <ul className="grid grid-cols-2 gap-x-6 gap-y-1">
                {directions.map((d) => (
                  <li key={d.id}>
                    <Link href={`/produkciya/${d.slug}`} className="block rounded-[4px] p-2 transition-colors hover:bg-muted hover:text-accent-dark">
                      <span className="block text-sm font-medium">{d.title}</span>
                      <span className="block text-xs text-muted-fg">{d.shortDescription}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <Link href="/obekty" className={linkCls}>
            Объекты
          </Link>
          <div className="group relative">
            <Link href="/o-kompanii" className={linkCls}>
              О компании
            </Link>
            <div className="invisible absolute left-0 top-full z-40 w-56 border border-border bg-bg p-2 translate-y-2 opacity-0 shadow-xl transition duration-200 group-focus-within:visible group-focus-within:translate-y-0 group-focus-within:opacity-100 group-hover:visible group-hover:translate-y-0 group-hover:opacity-100">
              {NAV_ABOUT.map((a) => (
                <Link key={a.href} href={a.href} className="block rounded-[4px] px-3 py-2 text-sm transition-colors hover:bg-muted hover:text-accent-dark">
                  {a.label}
                </Link>
              ))}
            </div>
          </div>
          <Link href="/goszakazchikam" className={linkCls}>
            Госзаказчикам
          </Link>
          <Link href="/kontakty" className={linkCls}>
            Контакты
          </Link>
        </nav>

        <div className="flex items-center gap-1">
          <SearchButton />
          {phone ? (
            <a href={phone.href} className="hidden items-center gap-2 px-2 text-sm font-bold lg:inline-flex">
              <Phone className="size-4" />
              {phone.display}
            </a>
          ) : null}
          <HeaderCta />
          <div className="flex items-center lg:hidden">
            <MobileNav
              directions={directions.map((d) => ({ slug: d.slug, title: d.title }))}
              about={NAV_ABOUT}
              phone={phone}
              telegramUrl={settings.telegramUrl}
            />
          </div>
        </div>
      </Container>
    </header>
  )
}
