import { Kysely, sql } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  // ──────────────────────────────────────────────
  // Add email_verified to existing users table
  // ──────────────────────────────────────────────
  await db.schema
    .alterTable('users')
    .addColumn('email_verified', 'boolean', (col) => col.defaultTo(false).notNull())
    .execute();

  // ──────────────────────────────────────────────
  // account — stores credential + OAuth accounts
  // ──────────────────────────────────────────────
  await db.schema
    .createTable('account')
    .addColumn('id', 'text', (col) => col.primaryKey())
    .addColumn('user_id', 'text', (col) => col.notNull().references('users.id').onDelete('cascade'))
    .addColumn('account_id', 'text', (col) => col.notNull())
    .addColumn('provider_id', 'text', (col) => col.notNull())
    .addColumn('access_token', 'text')
    .addColumn('refresh_token', 'text')
    .addColumn('id_token', 'text')
    .addColumn('access_token_expires_at', 'timestamptz')
    .addColumn('refresh_token_expires_at', 'timestamptz')
    .addColumn('scope', 'text')
    .addColumn('password', 'text')
    .addColumn('created_at', 'timestamptz', (col) => col.notNull().defaultTo(sql`CURRENT_TIMESTAMP`))
    .addColumn('updated_at', 'timestamptz', (col) => col.notNull().defaultTo(sql`CURRENT_TIMESTAMP`))
    .execute();

  await db.schema
    .createIndex('idx_account_user_id')
    .on('account')
    .column('user_id')
    .execute();

  // ──────────────────────────────────────────────
  // session — better-auth sessions
  // ──────────────────────────────────────────────
  await db.schema
    .createTable('session')
    .addColumn('id', 'text', (col) => col.primaryKey())
    .addColumn('user_id', 'text', (col) => col.notNull().references('users.id').onDelete('cascade'))
    .addColumn('token', 'text', (col) => col.notNull().unique())
    .addColumn('expires_at', 'timestamptz', (col) => col.notNull())
    .addColumn('ip_address', 'text')
    .addColumn('user_agent', 'text')
    .addColumn('created_at', 'timestamptz', (col) => col.notNull().defaultTo(sql`CURRENT_TIMESTAMP`))
    .addColumn('updated_at', 'timestamptz', (col) => col.notNull().defaultTo(sql`CURRENT_TIMESTAMP`))
    .execute();

  await db.schema
    .createIndex('idx_session_user_id')
    .on('session')
    .column('user_id')
    .execute();

  // ──────────────────────────────────────────────
  // verification — email verification / password reset tokens
  // ──────────────────────────────────────────────
  await db.schema
    .createTable('verification')
    .addColumn('id', 'text', (col) => col.primaryKey())
    .addColumn('identifier', 'text', (col) => col.notNull())
    .addColumn('value', 'text', (col) => col.notNull())
    .addColumn('expires_at', 'timestamptz', (col) => col.notNull())
    .addColumn('created_at', 'timestamptz', (col) => col.notNull().defaultTo(sql`CURRENT_TIMESTAMP`))
    .addColumn('updated_at', 'timestamptz', (col) => col.notNull().defaultTo(sql`CURRENT_TIMESTAMP`))
    .execute();

  await db.schema
    .createIndex('idx_verification_identifier')
    .on('verification')
    .column('identifier')
    .execute();

  // ──────────────────────────────────────────────
  // jwks — JWT signing keys (managed by better-auth JWT plugin)
  // ──────────────────────────────────────────────
  await db.schema
    .createTable('jwks')
    .addColumn('id', 'text', (col) => col.primaryKey())
    .addColumn('public_key', 'text', (col) => col.notNull())
    .addColumn('private_key', 'text', (col) => col.notNull())
    .addColumn('created_at', 'timestamptz', (col) => col.notNull().defaultTo(sql`CURRENT_TIMESTAMP`))
    .execute();

  // ──────────────────────────────────────────────
  // Migrate existing passwords to account table
  // ──────────────────────────────────────────────
  await sql`
    INSERT INTO account (id, user_id, account_id, provider_id, password, created_at, updated_at)
    SELECT
      gen_random_uuid()::text,
      id,
      id,
      'credential',
      password_hash,
      created_at,
      COALESCE(updated_at, CURRENT_TIMESTAMP)
    FROM users
    WHERE password_hash IS NOT NULL
  `.execute(db);
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema.dropTable('jwks').ifExists().execute();
  await db.schema.dropTable('verification').ifExists().execute();
  await db.schema.dropTable('session').ifExists().execute();
  await db.schema.dropTable('account').ifExists().execute();
  await db.schema
    .alterTable('users')
    .dropColumn('email_verified')
    .execute();
}
