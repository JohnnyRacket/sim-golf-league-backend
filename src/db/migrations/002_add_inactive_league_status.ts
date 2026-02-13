import { Kysely, sql } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  await sql`ALTER TYPE league_status ADD VALUE 'inactive'`.execute(db);
}

export async function down(db: Kysely<any>): Promise<void> {
  // PostgreSQL doesn't support removing enum values directly.
  // Recreate the type without 'inactive' and update the column.
  await sql`ALTER TABLE leagues ALTER COLUMN status TYPE text`.execute(db);
  await sql`DROP TYPE league_status`.execute(db);
  await sql`CREATE TYPE league_status AS ENUM ('pending', 'active', 'completed')`.execute(db);
  await sql`ALTER TABLE leagues ALTER COLUMN status TYPE league_status USING status::league_status`.execute(db);
}
