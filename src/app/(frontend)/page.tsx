import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { ArrowRight, ArrowUpRight, Building2, HardHat, PencilRuler } from 'lucide-react'
import { getDirections, getDocuments, getFeaturedProjects, getHomePage, getSiteSettings } from '@/lib/queries'
import { buildMetadata } from '@/lib/seo'
import { imageOf } from '@/lib/media'
import { primaryPhone } from '@/lib/site'
import { DirectionCard } from '@/components/catalog/cards'
import { Facts, ProjectsBlock, DocumentsBlock } from '@/components/blocks/blocks'
import { Container, SectionTitle } from '@/components/ui/misc'
import { LinkButton } from '@/components/ui/button'
import { LeadButton, InlineLeadForm } from '@/components/forms/lead-provider'
import { TrackedLink } from '@/components/blocks/download-link'
import { Reveal } from '@/components/ui/reveal'

export async function generateMetadata(): Promise<Metadata> {
  const [s, home] = await Promise.all([getSiteSettings(), getHomePage()])
  return buildMetadata({
    title: `${s.companyName} — производство МАФ, металлоконструкций и инженерных систем`,
    description: home.heroSubtitle,
    path: '/',
    image: imageOf(home.heroImage, 'hero')?.url,
  })
}

const AUDIENCE_ICONS = [Building2, HardHat, PencilRuler]

export default async function HomePageRoute() {
  const [settings, home, directions, projects, docs] = await Promise.all([
    getSiteSettings(),
    getHomePage(),
    getDirections(),
    getFeaturedProjects(6),
    getDocuments({ onlyHome: true, limit: 6 }),
  ])
  const phone = primaryPhone(settings)
  const hero = imageOf(home.heroImage, 'hero')
  const prodImages = (home.productionImages ?? []).map((i) => imageOf(i, 'card')).filter((i): i is NonNullable<typeof i> => Boolean(i))

  return (
    <>
      <section className="bg-grid-dark relative overflow-hidden text-inverse-fg">
        {/* крупная стрела на фоне */}
        <svg aria-hidden viewBox="0 0 400 400" className="float-y pointer-events-none absolute -right-24 -top-16 hidden h-[560px] w-[560px] text-accent opacity-[0.12] lg:block">
          <path d="M40 360 L320 80 M320 80 H170 M320 80 V230" fill="none" stroke="currentColor" strokeWidth="26" strokeLinecap="square" />
        </svg>
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-ink to-transparent" />
        <Container className="relative grid items-center gap-10 py-14 md:py-20 lg:grid-cols-[1.05fr_1fr] lg:py-24">
          <div>
            <p className="section-eyebrow anim-fade-up">Производитель металлоконструкций</p>
            <h1 className="anim-fade-up mt-5 break-words font-display text-[28px] font-bold leading-[1.1] tracking-tight sm:text-4xl md:text-6xl" style={{ '--d': '120ms' } as React.CSSProperties}>
              {home.heroTitle}
            </h1>
            <p className="anim-fade-up mt-6 max-w-xl text-lg text-white/75" style={{ '--d': '260ms' } as React.CSSProperties}>
              {home.heroSubtitle}
            </p>
            <div className="anim-fade-up mt-8 flex flex-wrap gap-3" style={{ '--d': '400ms' } as React.CSSProperties}>
              <LinkButton href="/produkciya" variant="accent" className="px-6">
                Наша продукция <ArrowRight className="size-4" />
              </LinkButton>
              <LeadButton type="callback" label="Запросить КП" variant="outline-light" className="px-6" />
            </div>
            {phone ? (
              <p className="anim-fade-up mt-8 flex items-center gap-3 text-sm text-white/70" style={{ '--d': '520ms' } as React.CSSProperties}>
                <span className="pulse-ring size-2.5 rounded-full bg-accent" aria-hidden />
                Звоните:
                <TrackedLink href={phone.href} goal="click_phone" className="font-display text-lg font-bold text-white">
                  {phone.display}
                </TrackedLink>
              </p>
            ) : null}
          </div>
          {hero ? (
            <div className="anim-slide-right relative" style={{ '--d': '300ms' } as React.CSSProperties}>
              <div className="absolute -bottom-4 -left-4 hidden size-full border-2 border-accent md:block" aria-hidden />
              <div className="relative aspect-[4/3] overflow-hidden bg-muted">
                <Image src={hero.url} alt={hero.alt} fill priority sizes="(min-width:1024px) 50vw, 100vw" className="object-cover" />
              </div>
            </div>
          ) : null}
        </Container>

        {directions.length ? (
          <div className="marquee relative border-t border-white/10 bg-ink/80 py-4" aria-hidden>
            <div className="marquee-track gap-10 whitespace-nowrap font-display text-sm font-bold uppercase tracking-widest text-white/60">
              {[...directions, ...directions].map((d, i) => (
                <span key={`${d.id}-${i}`} className="flex items-center gap-10">
                  {d.title}
                  <span className="text-accent">/</span>
                </span>
              ))}
            </div>
          </div>
        ) : null}
      </section>

      <Facts settings={settings} />

      <Container>
        <section className="mt-20">
          <Reveal>
            <SectionTitle eyebrow="Что мы делаем">Продукция и услуги</SectionTitle>
          </Reveal>
          {directions.length ? (
            <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {directions.map((d, i) => (
                <Reveal key={d.id} delay={(i % 4) * 90}>
                  <DirectionCard d={d} />
                </Reveal>
              ))}
            </div>
          ) : (
            <div className="mt-6 rounded-[4px] border border-border bg-muted p-8 text-center">
              <p className="text-muted-fg">Каталог наполняется</p>
              {phone ? (
                <TrackedLink href={phone.href} goal="click_phone" className="mt-4 inline-flex min-h-11 items-center rounded-[4px] border border-fg px-5 text-sm font-medium">
                  Позвонить
                </TrackedLink>
              ) : null}
            </div>
          )}
        </section>

        {(home.audiences ?? []).length ? (
          <section className="mt-20 grid gap-6 md:grid-cols-3">
            {(home.audiences ?? []).map((a, i) => {
              const Icon = AUDIENCE_ICONS[i] ?? Building2
              return (
                <Reveal key={a.id ?? a.title} delay={i * 110}>
                  <Link href={a.href} className="card-lift group block h-full rounded-[4px] border border-border bg-bg p-7">
                    <span className="grid size-14 place-items-center rounded-full bg-ink text-white transition-colors duration-300 group-hover:bg-accent">
                      <Icon className="size-7" />
                    </span>
                    <h3 className="mt-5 font-display text-xl font-bold">{a.title}</h3>
                    <p className="mt-2 text-sm text-muted-fg">{a.text}</p>
                    <ArrowUpRight className="mt-5 size-6 text-accent transition-transform duration-300 group-hover:-translate-y-1 group-hover:translate-x-1" />
                  </Link>
                </Reveal>
              )
            })}
          </section>
        ) : null}

        {home.productionText || prodImages.length ? (
          <section className="mt-20 grid items-center gap-10 lg:grid-cols-2">
            <Reveal>
              <SectionTitle eyebrow="Цех">Собственное производство</SectionTitle>
              {home.productionText ? <p className="mt-5 text-lg text-muted-fg">{home.productionText}</p> : null}
              <LinkButton href="/proizvodstvo" variant="secondary" className="mt-7">
                О производстве <ArrowRight className="size-4" />
              </LinkButton>
            </Reveal>
            {prodImages.length ? (
              <div className="grid grid-cols-2 gap-3">
                {prodImages.slice(0, 4).map((img, i) => (
                  <Reveal key={img.url} delay={i * 100}>
                    <div className="card-lift relative aspect-[4/3] overflow-hidden rounded-[4px] bg-muted">
                      <Image src={img.url} alt={img.alt} fill sizes="(min-width:1024px) 25vw, 50vw" className="object-cover" />
                    </div>
                  </Reveal>
                ))}
              </div>
            ) : null}
          </section>
        ) : null}

        {projects.length >= 3 ? <ProjectsBlock projects={projects} className="mt-20" /> : null}

        <DocumentsBlock docs={docs} settings={settings} />

        {(home.steps ?? []).length ? (
          <section className="mt-20">
            <Reveal>
              <SectionTitle eyebrow="Порядок работы">Как мы работаем</SectionTitle>
            </Reveal>
            <ol className="mt-10 grid gap-8 md:grid-cols-2 lg:grid-cols-4">
              {(home.steps ?? []).map((s, i) => (
                <Reveal as="li" key={s.id ?? s.title} delay={i * 110} className="group relative border-t-2 border-border pt-5">
                  <span className="reveal-line absolute -top-0.5 left-0 h-0.5 w-full bg-accent" aria-hidden />
                  <span className="font-display text-5xl font-bold text-fg/15 transition-colors duration-300 group-hover:text-accent">{String(i + 1).padStart(2, '0')}</span>
                  <h3 className="mt-3 font-display text-lg font-bold">{s.title}</h3>
                  {s.text ? <p className="mt-1 text-sm text-muted-fg">{s.text}</p> : null}
                </Reveal>
              ))}
            </ol>
          </section>
        ) : null}

        <Reveal as="section" className="bg-grid-dark relative mt-20 grid gap-10 overflow-hidden rounded-[4px] p-7 text-inverse-fg md:p-12 lg:grid-cols-2">
          <div>
            <SectionTitle eyebrow="Заявка">Расскажите о задаче — подготовим КП</SectionTitle>
            <div className="mt-6 space-y-2 text-sm">
              {phone ? (
                <p>
                  <TrackedLink href={phone.href} goal="click_phone" className="font-display text-2xl font-bold hover:text-accent">
                    {phone.display}
                  </TrackedLink>
                </p>
              ) : null}
              {settings.emails?.[0] ? (
                <p>
                  <TrackedLink href={`mailto:${settings.emails[0].email}`} goal="click_email" className="underline decoration-accent underline-offset-4">
                    {settings.emails[0].email}
                  </TrackedLink>
                </p>
              ) : null}
              {settings.responseTimePromise ? <p className="text-white/70">{settings.responseTimePromise}</p> : null}
            </div>
          </div>
          <div className="rounded-[4px] bg-bg p-5 text-fg md:p-6">
            <InlineLeadForm type="callback" />
          </div>
        </Reveal>
      </Container>
    </>
  )
}
