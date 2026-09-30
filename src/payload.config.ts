import path from 'node:path'
import { buildConfig } from 'payload'
import { postgresAdapter } from '@payloadcms/db-postgres'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import { nodemailerAdapter } from '@payloadcms/email-nodemailer'
import { seoPlugin } from '@payloadcms/plugin-seo'
import { ru } from '@payloadcms/translations/languages/ru'
import sharp from 'sharp'
import { Users } from './collections/Users'
import { Media } from './collections/Media'
import { ProductImages } from './collections/ProductImages'
import { Files } from './collections/Files'
import { Directions } from './collections/Directions'
import { Categories } from './collections/Categories'
import { Products } from './collections/Products'
import { Projects } from './collections/Projects'
import { Documents } from './collections/Documents'
import { Pages } from './collections/Pages'
import { Leads } from './collections/Leads'
import { SiteSettings } from './globals/SiteSettings'
import { HomePage } from './globals/HomePage'

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'
const smtpConfigured = Boolean(process.env.SMTP_USER && process.env.SMTP_PASS)

export default buildConfig({
  serverURL: SITE,
  secret: process.env.PAYLOAD_SECRET ?? '',
  admin: { user: Users.slug, meta: { titleSuffix: ' — управление сайтом' } },
  i18n: { supportedLanguages: { ru }, fallbackLanguage: 'ru' },
  collections: [Users, Media, ProductImages, Files, Directions, Categories, Products, Projects, Documents, Pages, Leads],
  globals: [SiteSettings, HomePage],
  editor: lexicalEditor(),
  db: postgresAdapter({
    idType: 'uuid',
    pool: { connectionString: process.env.DATABASE_URI ?? '' },
    migrationDir: path.resolve(process.cwd(), 'src/migrations'),
    // локально схема подтягивается автоматически, на сервере — только миграциями
    push: process.env.NODE_ENV !== 'production',
  }),
  email: smtpConfigured
    ? nodemailerAdapter({
        defaultFromAddress: process.env.SMTP_FROM ?? '',
        defaultFromName: process.env.SMTP_FROM_NAME ?? '',
        transportOptions: {
          host: 'smtp.yandex.ru',
          port: 465,
          secure: true,
          auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
        },
      })
    : undefined,
  sharp,
  upload: { limits: { fileSize: 20 * 1024 * 1024 } },
  cors: [SITE],
  csrf: [SITE],
  plugins: [
    seoPlugin({
      collections: ['directions', 'categories', 'products', 'projects', 'pages'],
      uploadsCollection: 'media',
      tabbedUI: true,
      generateTitle: ({ doc }) =>
        `${(doc as { title?: string }).title ?? ''} — ${process.env.NEXT_PUBLIC_COMPANY_SHORT ?? ''}`,
    }),
  ],
  typescript: { outputFile: path.resolve(process.cwd(), 'src/payload-types.ts') },
})
