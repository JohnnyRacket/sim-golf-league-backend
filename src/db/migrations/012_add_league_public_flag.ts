import { Kysely, sql } from "kysely";

export async function up(db: Kysely<any>): Promise<void> {
  // Add is_public flag to leagues
  await db.schema
    .alterTable("leagues")
    .addColumn("is_public", "boolean", (col) =>
      col.defaultTo(true).notNull(),
    )
    .execute();

  // Index on league name for search (ILIKE with btree on lower)
  await db.schema
    .createIndex("idx_leagues_name_lower")
    .on("leagues")
    .expression(sql`lower(name)`)
    .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema.dropIndex("idx_leagues_name_lower").execute();
  await db.schema.alterTable("leagues").dropColumn("is_public").execute();
}
