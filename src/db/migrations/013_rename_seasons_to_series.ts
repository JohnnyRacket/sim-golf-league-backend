import { Kysely, sql } from "kysely";

export async function up(db: Kysely<any>): Promise<void> {
  // Add series_new_league to the notification_type enum
  await sql`ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'series_new_league'`.execute(
    db,
  );

  // Rename seasons table to series
  await sql`ALTER TABLE seasons RENAME TO series`.execute(db);

  // Rename season_id column on leagues to series_id
  await sql`ALTER TABLE leagues RENAME COLUMN season_id TO series_id`.execute(
    db,
  );

  // Rename indexes
  await sql`ALTER INDEX idx_leagues_season_id RENAME TO idx_leagues_series_id`.execute(
    db,
  );
  await sql`ALTER INDEX idx_seasons_location_id RENAME TO idx_series_location_id`.execute(
    db,
  );
}

export async function down(db: Kysely<any>): Promise<void> {
  // Rename indexes back
  await sql`ALTER INDEX idx_series_location_id RENAME TO idx_seasons_location_id`.execute(
    db,
  );
  await sql`ALTER INDEX idx_leagues_series_id RENAME TO idx_leagues_season_id`.execute(
    db,
  );

  // Rename series_id column back to season_id
  await sql`ALTER TABLE leagues RENAME COLUMN series_id TO season_id`.execute(
    db,
  );

  // Rename series table back to seasons
  await sql`ALTER TABLE series RENAME TO seasons`.execute(db);

  // Note: Cannot remove enum value in PostgreSQL without recreating the type
}
