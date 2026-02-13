import { Kysely, sql } from "kysely";

export async function up(db: Kysely<any>): Promise<void> {
  // Create seasons table
  await db.schema
    .createTable("seasons")
    .addColumn("id", "uuid", (col) => col.primaryKey())
    .addColumn("location_id", "uuid", (col) =>
      col.references("locations.id").onDelete("cascade").notNull(),
    )
    .addColumn("name", "varchar(255)", (col) => col.notNull())
    .addColumn("description", "text")
    .addColumn("start_date", "date", (col) => col.notNull())
    .addColumn("end_date", "date", (col) => col.notNull())
    .addColumn("is_active", "boolean", (col) => col.defaultTo(true).notNull())
    .addColumn("created_at", "timestamptz", (col) =>
      col.defaultTo(sql`now()`).notNull(),
    )
    .addColumn("updated_at", "timestamptz", (col) =>
      col.defaultTo(sql`now()`).notNull(),
    )
    .execute();

  // Add season_id to leagues table (nullable for backward compat)
  await db.schema
    .alterTable("leagues")
    .addColumn("season_id", "uuid", (col) =>
      col.references("seasons.id").onDelete("set null"),
    )
    .execute();

  // Index for looking up leagues by season
  await db.schema
    .createIndex("idx_leagues_season_id")
    .on("leagues")
    .column("season_id")
    .execute();

  // Index for looking up seasons by location
  await db.schema
    .createIndex("idx_seasons_location_id")
    .on("seasons")
    .column("location_id")
    .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema.alterTable("leagues").dropColumn("season_id").execute();
  await db.schema.dropTable("seasons").execute();
}
