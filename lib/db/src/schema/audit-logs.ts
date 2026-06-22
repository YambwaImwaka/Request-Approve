import { pgTable, serial, timestamp, integer, text } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable, userRoleEnum } from "./users";
import { applicationsTable, applicationStatusEnum } from "./applications";

export const auditLogsTable = pgTable("audit_logs", {
  id: serial("id").primaryKey(),
  applicationId: integer("application_id")
    .notNull()
    .references(() => applicationsTable.id),
  userId: integer("user_id")
    .notNull()
    .references(() => usersTable.id),
  userRole: userRoleEnum("user_role").notNull(),
  previousStatus: applicationStatusEnum("previous_status").notNull(),
  newStatus: applicationStatusEnum("new_status").notNull(),
  comment: text("comment"),
  timestamp: timestamp("timestamp", { withTimezone: true }).notNull().defaultNow(),
});

export const insertAuditLogSchema = createInsertSchema(auditLogsTable).omit({
  id: true,
  timestamp: true,
});
export type InsertAuditLog = z.infer<typeof insertAuditLogSchema>;
export type AuditLog = typeof auditLogsTable.$inferSelect;
