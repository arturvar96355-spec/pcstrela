import { LinkButton } from '@/components/ui/button'
import { Container } from '@/components/ui/misc'

export default function NotFound() {
  return (
    <Container className="py-20 text-center">
      <h1 className="font-display text-4xl font-bold">Страница не найдена</h1>
      <p className="mt-3 text-muted-fg">Возможно, ссылка устарела. Воспользуйтесь поиском в шапке сайта или перейдите в раздел.</p>
      <div className="mt-6 flex justify-center gap-3">
        <LinkButton href="/produkciya">Продукция</LinkButton>
        <LinkButton href="/kontakty" variant="secondary">
          Контакты
        </LinkButton>
      </div>
    </Container>
  )
}
