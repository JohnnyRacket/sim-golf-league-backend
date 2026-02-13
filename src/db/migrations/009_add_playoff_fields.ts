import { Kysely, sql } from "kysely";

export async function up(db: Kysely<any>): Promise<void> {
  // Add playoff-related fields to matches
  await db.schema
    .alterTable("matches")
    .addColumn("is_playoff", "boolean", (col) =>
      col.defaultTo(false).notNull(),
    )
    .execute();

  await db.schema
    .alterTable("matches")
    .addColumn("playoff_round", "integer")
    .execute();

  await db.schema
    .alterTable("matches")
    .addColumn("playoff_seed_home", "integer")
    .execute();

  await db.schema
    .alterTable("matches")
    .addColumn("playoff_seed_away", "integer")
    .execute();

  await db.schema
    .alterTable("matches")
    .addColumn("next_match_id", "uuid", (col) =>
      col.references("matches.id").onDelete("set null"),
    )
    .execute();

  await db.schema
    .createIndex("idx_matches_playoff")
    .on("matches")
    .columns(["league_id", "is_playoff", "playoff_round"])
    .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema
    .dropIndex("idx_matches_playoff")
    .execute();

  await db.schema
    .alterTable("matches")
    .dropColumn("next_match_id")
    .execute();

  await db.schema
    .alterTable("matches")
    .dropColumn("playoff_seed_away")
    .execute();

  await db.schema
    .alterTable("matches")
    .dropColumn("playoff_seed_home")
    .execute();

  await db.schema
    .alterTable("matches")
    .dropColumn("playoff_round")
    .execute();

  await db.schema
    .alterTable("matches")
    .dropColumn("is_playoff")
    .execute();
}
