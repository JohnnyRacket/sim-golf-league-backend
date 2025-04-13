import { Kysely, MysqlDialect } from 'kysely';
import { createPool } from 'mysql2';
import { Database } from '../types/database';

const dialect = new MysqlDialect({
  pool: createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'golf_league',
    port: Number(process.env.DB_PORT) || 3306,
    connectionLimit: 10,
  })
});

export const db = new Kysely<Database>({
  dialect,
}); 