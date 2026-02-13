import { Kysely, sql } from "kysely";

export async function up(db: Kysely<any>): Promise<void> {
  await db.schema
    .createTable("audit_logs")
    .addColumn("id", "uuid", (col) =>
      col.primaryKey().defaultTo(sql`gen_random_uuid()`),
    )
    .addColumn("user_id", "uuid", (col) =>
      col.references("users.id").onDelete("set null"),
    )
    .addColumn("action", "varchar(100)", (col) => col.notNull())
    .addColumn("entity_type", "varchar(50)", (col) => col.notNull())
    .addColumn("entity_id", "uuid", (col) => col.notNull())
    .addColumn("details", "jsonb")
    .addColumn("ip_address", "varchar(45)")
    .addColumn("created_at", "timestamptz", (col) =>
      col.defaultTo(sql`now()`).notNull(),
    )
    .execute();

  await db.schema
    .createIndex("idx_audit_logs_entity")
    .on("audit_logs")
    .columns(["entity_type", "entity_id"])
    .execute();

  await db.schema
    .createIndex("idx_audit_logs_user_id")
    .on("audit_logs")
    .column("user_id")
    .execute();

  await db.schema
    .createIndex("idx_audit_logs_action")
    .on("audit_logs")
    .column("action")
    .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema.dropTable("audit_logs").execute();
}
