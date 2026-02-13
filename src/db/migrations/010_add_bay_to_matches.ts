import { Kysely, sql } from "kysely";

export async function up(db: Kysely<any>): Promise<void> {
  // Add optional bay_id to matches for informational purposes
  await db.schema
    .alterTable("matches")
    .addColumn("bay_id", "uuid", (col) =>
      col.references("bays.id").onDelete("set null"),
    )
    .execute();

  await db.schema
    .createIndex("idx_matches_bay_id")
    .on("matches")
    .column("bay_id")
    .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema.dropIndex("idx_matches_bay_id").execute();
  await db.schema.alterTable("matches").dropColumn("bay_id").execute();
}
