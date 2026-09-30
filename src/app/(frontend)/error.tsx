'use client'

import Link from 'next/link'
import { AlertCircle } from 'lucide-react'
import { Button, LinkButton } from '@/components/ui/button'
import { Container } from '@/components/ui/misc'

export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  return (
    <Container className="py-20 text-center">
      <AlertCircle className="mx-auto size-12" />
      <h1 className="mt-4 font-display text-3xl font-bold">Не удалось загрузить страницу</h1>
      <p className="mt-2 text-muted-fg">Попробуйте обновить страницу. Если не помогает — свяжитесь с нами: раздел «Контакты».</p>
      <div className="mt-6 flex justify-center gap-3">
        <Button onClick={() => reset()}>Обновить</Button>
        <LinkButton href="/" variant="secondary">
          На главную
        </LinkButton>
      </div>
      <p className="mt-6 text-sm">
        <Link href="/kontakty" className="underline">
          Контакты
        </Link>
      </p>
    </Container>
  )
}
