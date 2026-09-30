import Image from 'next/image'
import { BadgeCheck, Download, FileCheck2, FileText } from 'lucide-react'
import type { Document, Project, SiteSetting } from '@/payload-types'
import { DOC_TYPES } from '@/collections/Documents'
import { formatDate } from '@/lib/format'
import { fileUrl, imageOf } from '@/lib/media'
import { hasRequisites } from '@/lib/site'
import { ProjectCard } from '@/components/catalog/cards'
import { LinkButton } from '@/components/ui/button'
import { Container, SectionTitle } from '@/components/ui/misc'
import { DownloadLink } from './download-link'

export function Facts({ settings }: { settings: SiteSetting }) {
  const facts = settings.facts ?? []
  if (!facts.length) return null
  return (
    <section className="border-y border-border bg-muted py-10">
      <Container>
        <dl className="grid grid-cols-2 gap-6 lg:grid-cols-4">
          {facts.map((f) => (
            <div key={f.id ?? f.label}>
              <dt className="font-display text-4xl font-bold md:text-5xl">{f.value}</dt>
              <dd className="mt-1 text-sm text-muted-fg">{f.label}</dd>
            </div>
          ))}
        </dl>
      </Container>
    </section>
  )
}

export function ProjectsBlock({ projects, title = 'Объекты', all = true, className }: { projects: Project[]; title?: string; all?: boolean; className?: string }) {
  if (!projects.length) return null
  return (
    <section className={className ?? 'mt-14'}>
      <div className="flex items-end justify-between gap-4">
        <SectionTitle>{title}</SectionTitle>
        {all ? (
          <LinkButton href="/obekty" variant="secondary">
            Все объекты
          </LinkButton>
        ) : null}
      </div>
      <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {projects.map((p) => (
          <ProjectCard key={p.id} p={p} />
        ))}
      </div>
    </section>
  )
}

const docLabel = (v: string) => DOC_TYPES.find((t) => t.value === v)?.label ?? v

export function DocumentCard({ d }: { d: Document }) {
  const url = fileUrl(d.file)
  const preview = imageOf(d.preview, 'card')
  const valid = formatDate(d.validUntil)
  return (
    <article className="flex flex-col overflow-hidden rounded-[4px] border border-border">
      <div className="relative aspect-[3/4] w-full bg-muted">
        {preview ? (
          <Image src={preview.url} alt={preview.alt || d.title} fill sizes="(min-width:1024px) 25vw, 50vw" className="object-contain" />
        ) : (
          <div className="absolute inset-0 grid place-items-center text-muted-fg">
            <FileText className="size-10" aria-hidden />
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-1 p-3 text-sm">
        <p className="text-xs text-muted-fg">{docLabel(d.docType)}</p>
        <h3 className="font-medium">{d.title}</h3>
        {d.number ? <p className="text-muted-fg">№ {d.number}</p> : null}
        {valid ? <p className="text-muted-fg">Действует до {valid}</p> : null}
        {url ? (
          <DownloadLink href={url} goal="download_document" className="mt-auto inline-flex min-h-11 items-center gap-2 pt-2 font-medium underline">
            <Download className="size-4" /> Открыть PDF
          </DownloadLink>
        ) : null}
      </div>
    </article>
  )
}

export function DocumentsBlock({ docs, settings, title = 'Документы', limit }: { docs: Document[]; settings?: SiteSetting; title?: string; limit?: number }) {
  const list = limit ? docs.slice(0, limit) : docs
  if (!list.length && !settings?.gispNote) return null
  return (
    <section className="mt-14">
      <div className="flex items-end justify-between gap-4">
        <SectionTitle>{title}</SectionTitle>
        <LinkButton href="/dokumenty" variant="secondary">
          Все документы
        </LinkButton>
      </div>
      {settings?.gispNote ? (
        <p className="mt-4 flex items-start gap-2 rounded-[4px] border border-border bg-muted p-3 text-sm">
          <BadgeCheck className="mt-0.5 size-5 shrink-0" />
          {settings.gispNote}
        </p>
      ) : null}
      {list.length ? (
        <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          {list.map((d) => (
            <DocumentCard key={d.id} d={d} />
          ))}
        </div>
      ) : null}
    </section>
  )
}

export function RequisitesTable({ settings }: { settings: SiteSetting }) {
  if (!hasRequisites(settings)) return null
  const rows: Array<[string, string | null | undefined]> = [
    ['Полное наименование', settings.legalName],
    ['ИНН', settings.inn],
    ['КПП', settings.kpp],
    ['ОГРН', settings.ogrn],
    ['Юридический адрес', settings.legalAddress],
    ['Адрес производства', settings.productionAddress],
    ['Банковские реквизиты', settings.bankDetails],
  ]
  const card = fileUrl(settings.companyCardFile)
  return (
    <section className="mt-14">
      <SectionTitle>Реквизиты</SectionTitle>
      <table className="mt-4 w-full border-collapse text-sm">
        <tbody>
          {rows
            .filter(([, v]) => v)
            .map(([k, v]) => (
              <tr key={k} className="border-b border-border align-top">
                <th scope="row" className="w-1/3 py-3 pr-4 text-left font-normal text-muted-fg">
                  {k}
                </th>
                <td className="whitespace-pre-line py-3">{v}</td>
              </tr>
            ))}
        </tbody>
      </table>
      {card ? (
        <DownloadLink href={card} goal="download_document" className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-[4px] border border-fg px-5 text-sm font-medium hover:bg-muted">
          <FileCheck2 className="size-4" /> Скачать карточку предприятия
        </DownloadLink>
      ) : null}
    </section>
  )
}

