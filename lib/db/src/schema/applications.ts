import { pgTable, text, serial, timestamp, numeric, integer, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const applicationStatusEnum = pgEnum("application_status", [
  "DRAFT",
  "SUBMITTED",
  "UNDER_REVIEW",
  "APPROVED",
  "REJECTED",
  "CHANGES_REQUESTED",
]);

export const applicationsTable = pgTable("applications", {
  id: serial("id").primaryKey(),
  companyName: text("company_name").notNull(),
  registrationNumber: text("registration_number").notNull(),
  beneficialOwnerName: text("beneficial_owner_name").notNull(),
  ownershipPercentage: numeric("ownership_percentage", { precision: 5, scale: 2 }).notNull(),
  changeReason: text("change_reason").notNull(),
  supportingNotes: text("supporting_notes"),
  status: applicationStatusEnum("status").notNull().default("DRAFT"),
  userId: integer("user_id")
    .notNull()
    .references(() => usersTable.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const insertApplicationSchema = createInsertSchema(applicationsTable).omit({
  id: true,
  status: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertApplication = z.infer<typeof insertApplicationSchema>;
export type Application = typeof applicationsTable.$inferSelect;
