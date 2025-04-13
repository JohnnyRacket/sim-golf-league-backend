import { Kysely, PostgresDialect } from 'kysely';
import { Pool } from 'pg';
import { Database } from '../types/database';

const dialect = new PostgresDialect({
  pool: new Pool({
    host: process.env.DB_HOST || 'db',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_NAME || 'golf_sim_league',
    port: Number(process.env.DB_PORT) || 5432,
    max: 10
  })
});

export const db = new Kysely<Database>({
  dialect,
}); 