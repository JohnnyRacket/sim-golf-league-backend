import { defineConfig } from 'kysely-ctl';
import { PostgresDialect } from 'kysely';
import pg from 'pg';
const { Pool } = pg;

export default defineConfig({
  dialect: new PostgresDialect({
    pool: new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      database: process.env.DB_NAME || 'golf_sim_league',
    }),
  }),
  migrations: {
    migrationFolder: 'src/db/migrations',
  },
});
