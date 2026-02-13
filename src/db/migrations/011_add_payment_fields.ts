import { Kysely, sql } from "kysely";

export async function up(db: Kysely<any>): Promise<void> {
  // Add payment provider fields to owners for future Stripe integration
  await db.schema
    .alterTable("owners")
    .addColumn("payment_provider_customer_id", "varchar(255)")
    .execute();

  await db.schema
    .alterTable("owners")
    .addColumn("payment_provider_subscription_id", "varchar(255)")
    .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema
    .alterTable("owners")
    .dropColumn("payment_provider_subscription_id")
    .execute();

  await db.schema
    .alterTable("owners")
    .dropColumn("payment_provider_customer_id")
    .execute();
}
