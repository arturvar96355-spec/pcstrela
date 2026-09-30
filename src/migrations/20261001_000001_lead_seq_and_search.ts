import { type MigrateDownArgs, type MigrateUpArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`CREATE SEQUENCE IF NOT EXISTS lead_number_seq START WITH 1001;`)
  await db.execute(sql`CREATE EXTENSION IF NOT EXISTS pg_trgm;`)
  // ускоряет поиск ILIKE '%...%' по названию и артикулу
  await db.execute(sql`CREATE INDEX IF NOT EXISTS products_title_trgm ON products USING gin (title gin_trgm_ops);`)
  await db.execute(sql`CREATE INDEX IF NOT EXISTS products_sku_trgm ON products USING gin (sku gin_trgm_ops);`)
  await db.execute(sql`CREATE INDEX IF NOT EXISTS projects_title_trgm ON projects USING gin (title gin_trgm_ops);`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`DROP INDEX IF EXISTS projects_title_trgm;`)
  await db.execute(sql`DROP INDEX IF EXISTS products_sku_trgm;`)
  await db.execute(sql`DROP INDEX IF EXISTS products_title_trgm;`)
  await db.execute(sql`DROP SEQUENCE IF EXISTS lead_number_seq;`)
}
