import { Kysely, sql } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  await db.schema
    .alterTable('users')
    .addColumn('first_name', 'varchar(100)')
    .addColumn('last_name', 'varchar(100)')
    .addColumn('phone', 'varchar(20)')
    .addColumn('avatar_url', 'text')
    .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema
    .alterTable('users')
    .dropColumn('first_name')
    .dropColumn('last_name')
    .dropColumn('phone')
    .dropColumn('avatar_url')
    .execute();
}
