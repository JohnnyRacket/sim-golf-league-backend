import { Kysely, sql } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  // Add handicap mode to leagues
  await sql`CREATE TYPE handicap_mode AS ENUM ('none', 'manual', 'auto')`.execute(db);

  await db.schema
    .alterTable('leagues')
    .addColumn('handicap_mode', sql`handicap_mode`, (col) => col.defaultTo('none').notNull())
    .execute();

  // Add team handicap to teams
  await db.schema
    .alterTable('teams')
    .addColumn('team_handicap', 'decimal(5, 1)')
    .execute();

  // Create player handicaps table
  await db.schema
    .createTable('player_handicaps')
    .addColumn('id', 'uuid', (col) => col.primaryKey())
    .addColumn('user_id', 'uuid', (col) => col.references('users.id').onDelete('cascade').notNull())
    .addColumn('league_id', 'uuid', (col) => col.references('leagues.id').onDelete('cascade').notNull())
    .addColumn('handicap_index', 'decimal(5, 1)', (col) => col.notNull())
    .addColumn('effective_date', 'date', (col) => col.notNull())
    .addColumn('created_at', 'timestamptz', (col) => col.defaultTo(sql`now()`).notNull())
    .addColumn('updated_at', 'timestamptz', (col) => col.defaultTo(sql`now()`).notNull())
    .execute();

  // Unique constraint: one handicap per user per league per date
  await db.schema
    .createIndex('idx_player_handicaps_unique')
    .on('player_handicaps')
    .columns(['user_id', 'league_id', 'effective_date'])
    .unique()
    .execute();

  // Index for quick lookups by league
  await db.schema
    .createIndex('idx_player_handicaps_league')
    .on('player_handicaps')
    .column('league_id')
    .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema.dropTable('player_handicaps').execute();
  await db.schema.alterTable('teams').dropColumn('team_handicap').execute();
  await db.schema.alterTable('leagues').dropColumn('handicap_mode').execute();
  await sql`DROP TYPE handicap_mode`.execute(db);
}
