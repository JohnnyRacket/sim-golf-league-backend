import { Kysely, sql } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  // Create invite status enum
  await sql`CREATE TYPE invite_status AS ENUM ('pending', 'accepted', 'expired')`.execute(db);

  await db.schema
    .createTable('league_invites')
    .addColumn('id', 'uuid', (col) => col.primaryKey())
    .addColumn('league_id', 'uuid', (col) => col.references('leagues.id').onDelete('cascade').notNull())
    .addColumn('inviter_id', 'uuid', (col) => col.references('users.id').onDelete('cascade').notNull())
    .addColumn('recipient_email', 'varchar(255)', (col) => col.notNull())
    .addColumn('recipient_user_id', 'uuid', (col) => col.references('users.id').onDelete('set null'))
    .addColumn('role', sql`league_member_role`, (col) => col.notNull().defaultTo('player'))
    .addColumn('status', sql`invite_status`, (col) => col.notNull().defaultTo('pending'))
    .addColumn('invite_code', 'varchar(64)', (col) => col.notNull().unique())
    .addColumn('expires_at', 'timestamptz', (col) => col.notNull())
    .addColumn('created_at', 'timestamptz', (col) => col.defaultTo(sql`now()`).notNull())
    .addColumn('updated_at', 'timestamptz', (col) => col.defaultTo(sql`now()`).notNull())
    .execute();

  // Index for looking up invites by code (registration flow)
  await db.schema
    .createIndex('idx_league_invites_invite_code')
    .on('league_invites')
    .column('invite_code')
    .execute();

  // Index for looking up invites by recipient email
  await db.schema
    .createIndex('idx_league_invites_recipient_email')
    .on('league_invites')
    .column('recipient_email')
    .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema.dropTable('league_invites').execute();
  await sql`DROP TYPE invite_status`.execute(db);
}
