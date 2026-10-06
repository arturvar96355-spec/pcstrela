import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TABLE "directions_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" uuid NOT NULL,
  	"path" varchar NOT NULL,
  	"media_id" uuid
  );
  
  ALTER TABLE "directions_rels" ADD CONSTRAINT "directions_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."directions"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "directions_rels" ADD CONSTRAINT "directions_rels_media_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "directions_rels_order_idx" ON "directions_rels" USING btree ("order");
  CREATE INDEX "directions_rels_parent_idx" ON "directions_rels" USING btree ("parent_id");
  CREATE INDEX "directions_rels_path_idx" ON "directions_rels" USING btree ("path");
  CREATE INDEX "directions_rels_media_id_idx" ON "directions_rels" USING btree ("media_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "directions_rels" CASCADE;`)
}
