// Создаёт .env для локальной работы, если его ещё нет. Работает на Windows, Mac и Linux.
import fs from 'node:fs'
import crypto from 'node:crypto'

if (fs.existsSync('.env')) {
  console.log('.env уже есть, пропускаю')
  process.exit(0)
}
const secret = crypto.randomBytes(32).toString('hex')
const env = `NODE_ENV=development
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_COMPANY_SHORT=ПК Стрела
PAYLOAD_SECRET=${secret}
DATABASE_URI=postgres://site:site_dev@127.0.0.1:5432/site
SMTP_USER=
SMTP_PASS=
SMTP_FROM=noreply@localhost
SMTP_FROM_NAME=Сайт ПК Стрела
TELEGRAM_BOT_TOKEN=
WATERMARK_TEXT=ПК Стрела
SEED_ADMIN_EMAIL=admin@localhost.local
SEED_ADMIN_PASSWORD=admin-local-12345
SEED_COMPANY_NAME=ООО «ПК Стрела»
SEED_COMPANY_EMAIL=
SEED_NOTIFY_EMAIL=
`
fs.writeFileSync('.env', env, 'utf8')
console.log('.env создан')
