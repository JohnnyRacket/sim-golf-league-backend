import { Kysely, sql } from "kysely";

export async function up(db: Kysely<any>): Promise<void> {
  // Create subscription tier enum
  await sql`CREATE TYPE subscription_tier AS ENUM ('free', 'starter', 'pro', 'enterprise')`.execute(
    db,
  );
  await sql`CREATE TYPE subscription_status AS ENUM ('active', 'past_due', 'cancelled', 'trialing')`.execute(
    db,
  );

  // Add tier to owners table (billing is at the organization/owner level)
  await db.schema
    .alterTable("owners")
    .addColumn("subscription_tier", sql`subscription_tier`, (col) =>
      col.defaultTo("free").notNull(),
    )
    .addColumn("subscription_status", sql`subscription_status`, (col) =>
      col.defaultTo("active").notNull(),
    )
    .addColumn("subscription_expires_at", "timestamptz")
    .addColumn("max_locations", "integer", (col) => col.defaultTo(1).notNull())
    .addColumn("max_leagues_per_location", "integer", (col) =>
      col.defaultTo(2).notNull(),
    )
    .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema
    .alterTable("owners")
    .dropColumn("subscription_tier")
    .dropColumn("subscription_status")
    .dropColumn("subscription_expires_at")
    .dropColumn("max_locations")
    .dropColumn("max_leagues_per_location")
    .execute();

  await sql`DROP TYPE subscription_status`.execute(db);
  await sql`DROP TYPE subscription_tier`.execute(db);
}
