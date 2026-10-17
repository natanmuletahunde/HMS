import { pgTable, text, boolean, timestamp, integer, jsonb } from "drizzle-orm/pg-core";
import { tenantsTable } from "./tenants";

export const workflowDefinitionsTable = pgTable("workflow_definitions", {
  id:                text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  tenantId:          text("tenant_id").references(() => tenantsTable.id),
  name:              text("name").notNull(),
  code:              text("code").notNull(),
  description:       text("description"),
  entityType:        text("entity_type").notNull(), // purchase_request, leave_request, complaint, expense, custom
  triggerConditions: jsonb("trigger_conditions").default({}),
  isActive:          boolean("is_active").notNull().default(true),
  createdBy:         text("created_by"),
  createdAt:         timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt:         timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const workflowStepsTable = pgTable("workflow_steps", {
  id:              text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  workflowId:      text("workflow_id").notNull().references(() => workflowDefinitionsTable.id),
  stepOrder:       integer("step_order").notNull(),
  name:            text("name").notNull(),
  description:     text("description"),
  approverRole:    text("approver_role"),
  approverUserId:  text("approver_user_id"),
  action:          text("action").default("approve"), // approve, review, notify, auto
  conditions:      jsonb("conditions").default({}),
  escalationHours: integer("escalation_hours").default(48),
  isOptional:      boolean("is_optional").notNull().default(false),
  notifyOnAction:  boolean("notify_on_action").notNull().default(true),
  createdAt:       timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const workflowInstancesTable = pgTable("workflow_instances", {
  id:          text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  workflowId:  text("workflow_id").notNull().references(() => workflowDefinitionsTable.id),
  tenantId:    text("tenant_id").references(() => tenantsTable.id),
  entityType:  text("entity_type").notNull(),
  entityId:    text("entity_id").notNull(),
  entityLabel: text("entity_label"), // human-readable label for the entity
  currentStep: integer("current_step").default(0),
  totalSteps:  integer("total_steps").default(0),
  status:      text("status").notNull().default("pending"), // pending, in_progress, approved, rejected, cancelled, escalated
  startedBy:   text("started_by"),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  notes:       text("notes"),
  metadata:    jsonb("metadata").default({}),
  createdAt:   timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt:   timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const workflowApprovalsTable = pgTable("workflow_approvals", {
  id:          text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  instanceId:  text("instance_id").notNull().references(() => workflowInstancesTable.id),
  stepId:      text("step_id").references(() => workflowStepsTable.id),
  stepName:    text("step_name").notNull(),
  approverId:  text("approver_id"),
  approverName: text("approver_name"),
  action:      text("action"), // approved, rejected, delegated, escalated
  comments:    text("comments"),
  delegatedTo: text("delegated_to"),
  actedAt:     timestamp("acted_at", { withTimezone: true }),
  dueAt:       timestamp("due_at", { withTimezone: true }),
  createdAt:   timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type WorkflowDefinition = typeof workflowDefinitionsTable.$inferSelect;
export type WorkflowStep       = typeof workflowStepsTable.$inferSelect;
export type WorkflowInstance   = typeof workflowInstancesTable.$inferSelect;
export type WorkflowApproval   = typeof workflowApprovalsTable.$inferSelect;
