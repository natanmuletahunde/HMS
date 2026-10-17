import { pgTable, text, boolean, timestamp, integer } from "drizzle-orm/pg-core";

export const documentTypeEnum = [
  "image","pdf","document","invoice","receipt","contract","id_document","passport","other",
] as const;
export type DocumentType = (typeof documentTypeEnum)[number];

export const documentsTable = pgTable("documents", {
  id:            text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name:          text("name").notNull(),
  originalName:  text("original_name").notNull(),
  documentType:  text("document_type").notNull().$type<DocumentType>(),
  mimeType:      text("mime_type"),
  size:          integer("size"), // bytes
  storageType:   text("storage_type").notNull().default("local"), // local, s3
  storagePath:   text("storage_path").notNull(), // relative path or S3 key
  publicUrl:     text("public_url"),
  referenceType: text("reference_type"), // guest, employee, supplier, invoice, complaint, etc.
  referenceId:   text("reference_id"),
  description:   text("description"),
  version:       integer("version").notNull().default(1),
  tags:          text("tags"), // comma-separated
  isPublic:      boolean("is_public").notNull().default(false),
  isActive:      boolean("is_active").notNull().default(true),
  createdAt:     timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt:     timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
  deletedAt:     timestamp("deleted_at", { withTimezone: true }),
  createdBy:     text("created_by"),
  updatedBy:     text("updated_by"),
});

export type Document = typeof documentsTable.$inferSelect;
