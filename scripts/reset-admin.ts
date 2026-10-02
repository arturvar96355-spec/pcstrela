// Сброс пароля администратора на значение SEED_ADMIN_PASSWORD из .env.
// Запуск на сервере: docker compose --profile tools run --rm seed pnpm tsx scripts/reset-admin.ts
import { getPayload } from 'payload'
import config from '../src/payload.config'

const email = process.env.SEED_ADMIN_EMAIL
const password = process.env.SEED_ADMIN_PASSWORD
if (!email || !password) throw new Error('Заданы не все значения: SEED_ADMIN_EMAIL и SEED_ADMIN_PASSWORD')

const payload = await getPayload({ config })
const found = await payload.find({ collection: 'users', where: { email: { equals: email } }, limit: 1, overrideAccess: true })
const user = found.docs[0]
if (!user) throw new Error(`Пользователь ${email} не найден`)

await payload.update({
  collection: 'users',
  id: user.id,
  data: { password, loginAttempts: 0, lockUntil: null } as never,
  overrideAccess: true,
  context: { disableRevalidate: true },
})
console.log(`[reset-admin] пароль для ${email} обновлён`)
process.exit(0)
