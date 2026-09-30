import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { ArrowRight, Building2, HardHat, PencilRuler } from 'lucide-react'
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
      <section>
        <Container className="grid items-center gap-8 py-10 md:py-16 lg:grid-cols-2">
          <div>
            <h1 className="font-display text-4xl font-bold leading-tight md:text-5xl">{home.heroTitle}</h1>
            <p className="mt-4 text-lg text-muted-fg">{home.heroSubtitle}</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <LinkButton href="/produkciya">Каталог продукции</LinkButton>
              <LeadButton type="callback" label="Запросить КП" variant="secondary" />
            </div>
          </div>
          {hero ? (
            <div className="relative aspect-[4/3] overflow-hidden rounded-[4px] bg-muted">
              <Image src={hero.url} alt={hero.alt} fill priority sizes="(min-width:1024px) 50vw, 100vw" className="object-cover" />
            </div>
          ) : null}
        </Container>
      </section>

      <Facts settings={settings} />

      <Container>
        <section className="mt-14">
          <SectionTitle>Продукция и услуги</SectionTitle>
          {directions.length ? (
            <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {directions.map((d) => (
                <DirectionCard key={d.id} d={d} />
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
          <section className="mt-14 grid gap-6 md:grid-cols-3">
            {(home.audiences ?? []).map((a, i) => {
              const Icon = AUDIENCE_ICONS[i] ?? Building2
              return (
                <Link key={a.id ?? a.title} href={a.href} className="rounded-[4px] border border-border p-6 hover:border-fg">
                  <Icon className="size-8" />
                  <h3 className="mt-4 font-display text-xl font-bold">{a.title}</h3>
                  <p className="mt-2 text-sm text-muted-fg">{a.text}</p>
                  <ArrowRight className="mt-4 size-5" />
                </Link>
              )
            })}
          </section>
        ) : null}

        {home.productionText || prodImages.length ? (
          <section className="mt-14 grid items-center gap-8 lg:grid-cols-2">
            <div>
              <SectionTitle>Собственное производство</SectionTitle>
              {home.productionText ? <p className="mt-4 text-muted-fg">{home.productionText}</p> : null}
              <LinkButton href="/proizvodstvo" variant="secondary" className="mt-6">
                О производстве
              </LinkButton>
            </div>
            {prodImages.length ? (
              <div className="grid grid-cols-2 gap-3">
                {prodImages.slice(0, 4).map((img) => (
                  <div key={img.url} className="relative aspect-[4/3] overflow-hidden rounded-[4px] bg-muted">
                    <Image src={img.url} alt={img.alt} fill sizes="(min-width:1024px) 25vw, 50vw" className="object-cover" />
                  </div>
                ))}
              </div>
            ) : null}
          </section>
        ) : null}

        {projects.length >= 3 ? <ProjectsBlock projects={projects} /> : null}

        <DocumentsBlock docs={docs} settings={settings} />

        {(home.steps ?? []).length ? (
          <section className="mt-14">
            <SectionTitle>Как мы работаем</SectionTitle>
            <ol className="mt-6 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              {(home.steps ?? []).map((s, i) => (
                <li key={s.id ?? s.title} className="border-t-2 border-fg pt-4">
                  <span className="font-display text-3xl font-bold">{String(i + 1).padStart(2, '0')}</span>
                  <h3 className="mt-2 font-bold">{s.title}</h3>
                  {s.text ? <p className="mt-1 text-sm text-muted-fg">{s.text}</p> : null}
                </li>
              ))}
            </ol>
          </section>
        ) : null}

        <section className="mt-14 grid gap-8 rounded-[4px] border border-border p-6 md:p-10 lg:grid-cols-2">
          <div>
            <SectionTitle>Расскажите о задаче — подготовим КП</SectionTitle>
            <div className="mt-4 space-y-2 text-sm">
              {phone ? (
                <p>
                  <TrackedLink href={phone.href} goal="click_phone" className="text-xl font-bold">
                    {phone.display}
                  </TrackedLink>
                </p>
              ) : null}
              {settings.emails?.[0] ? (
                <p>
                  <TrackedLink href={`mailto:${settings.emails[0].email}`} goal="click_email" className="underline">
                    {settings.emails[0].email}
                  </TrackedLink>
                </p>
              ) : null}
              {settings.responseTimePromise ? <p className="text-muted-fg">{settings.responseTimePromise}</p> : null}
            </div>
          </div>
          <InlineLeadForm type="callback" />
        </section>
      </Container>
    </>
  )
}
