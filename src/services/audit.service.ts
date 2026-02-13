import { Kysely } from "kysely";
import { Database } from "../types/database";

interface AuditLogData {
  user_id?: string | null;
  action: string;
  entity_type: string;
  entity_id: string;
  details?: Record<string, unknown> | null;
  ip_address?: string | null;
}

export class AuditService {
  private db: Kysely<Database>;

  constructor(db: Kysely<Database>) {
    this.db = db;
  }

  async log(data: AuditLogData): Promise<void> {
    try {
      await this.db
        .insertInto("audit_logs")
        .values({
          user_id: data.user_id ?? null,
          action: data.action,
          entity_type: data.entity_type,
          entity_id: data.entity_id,
          details: data.details ?? null,
          ip_address: data.ip_address ?? null,
        })
        .execute();
    } catch {
      // Audit failures must never break business operations
      console.error("Audit log write failed:", data.action, data.entity_type, data.entity_id);
    }
  }
}
