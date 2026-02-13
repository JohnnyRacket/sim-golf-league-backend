import { Kysely, PostgresDialect } from 'kysely';
import { Pool } from 'pg';
import { Database } from '../types/database';
import { config } from '../utils/config';

const dialect = new PostgresDialect({
  pool: new Pool({
    host: config.db.host,
    user: config.db.user,
    password: config.db.password,
    database: config.db.name,
    port: config.db.port,
    max: 10
  })
});

export const db = new Kysely<Database>({
  dialect,
}); 