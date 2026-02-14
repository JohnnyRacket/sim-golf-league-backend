import { Kysely, PostgresDialect } from 'kysely';
import pg from 'pg';
const { Pool } = pg;
import { Database } from '../types/database';
import { config } from '../utils/config';

const dialect = new PostgresDialect({
  pool: new Pool({
    host: config.db.host,
    user: config.db.user,
    password: config.db.password,
    database: config.db.name,
    port: config.db.port,
    max: config.db.poolMax,
  })
});

export const db = new Kysely<Database>({
  dialect,
}); 