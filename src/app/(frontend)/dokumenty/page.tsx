import type { Metadata } from 'next'
import { getDocuments, getSiteSettings } from '@/lib/queries'
import { buildMetadata } from '@/lib/seo'
import { DOC_TYPES } from '@/collections/Documents'
import { Breadcrumbs } from '@/components/layout/breadcrumbs'
import { DocumentCard, RequisitesTable } from '@/components/blocks/blocks'
import { Container, EmptyState, SectionTitle } from '@/components/ui/misc'
import { LeadButton } from '@/components/forms/lead-provider'

export async function generateMetadata(): Promise<Metadata> {
  const s = await getSiteSettings()
  return buildMetadata({
    title: `Документы и сертификаты — ${s.companyName}`,
    description: 'Сертификаты, декларации, допуски и реквизиты компании.',
    path: '/dokumenty',
  })
}

const ORDER = ['registry', 'certificate', 'declaration', 'sro', 'license', 'letter', 'catalog', 'other']

export default async function DocumentsPage() {
  const [docs, settings] = await Promise.all([getDocuments(), getSiteSettings()])
  const groups = ORDER.map((t) => ({ type: t, label: DOC_TYPES.find((d) => d.value === t)?.label ?? t, items: docs.filter((d) => d.docType === t) })).filter((g) => g.items.length)

  return (
    <>
      <Breadcrumbs items={[{ name: 'Документы', path: '/dokumenty' }]} />
      <Container className="py-8">
        <h1 className="page-title font-display text-3xl font-bold md:text-5xl">Документы и сертификаты</h1>
        {groups.length ? (
          groups.map((g) => (
            <section key={g.type} className="mt-10">
              <SectionTitle as="h2">{g.label}</SectionTitle>
              <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
                {g.items.map((d) => (
                  <DocumentCard key={d.id} d={d} />
                ))}
              </div>
            </section>
          ))
        ) : (
          <div className="mt-8">
            <EmptyState action={<LeadButton type="callback" message="Прошу прислать документы на продукцию" label="Запросить документы" />}>
              Документы предоставим по запросу.
            </EmptyState>
          </div>
        )}
        <RequisitesTable settings={settings} />
      </Container>
    </>
  )
}
