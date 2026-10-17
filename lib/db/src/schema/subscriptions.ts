import { pgTable, text, boolean, timestamp, integer, numeric, jsonb } from "drizzle-orm/pg-core";
import { tenantsTable } from "./tenants";

export const subscriptionPlansTable = pgTable("subscription_plans", {
  id:                   text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name:                 text("name").notNull(),
  code:                 text("code").notNull().unique(), // trial, basic, professional, enterprise
  description:          text("description"),
  maxHotels:            integer("max_hotels"),         // null = unlimited
  maxUsers:             integer("max_users"),
  maxRooms:             integer("max_rooms"),
  storageLimitGb:       integer("storage_limit_gb"),
  apiLimitPerMonth:     integer("api_limit_per_month"),
  monthlyPrice:         numeric("monthly_price", { precision: 10, scale: 2 }).default("0"),
  annualPrice:          numeric("annual_price", { precision: 10, scale: 2 }).default("0"),
  features:             jsonb("features").default([]),  // list of feature flags
  isActive:             boolean("is_active").notNull().default(true),
  isFeatured:           boolean("is_featured").notNull().default(false),
  trialDays:            integer("trial_days").default(14),
  sortOrder:            integer("sort_order").default(0),
  createdAt:            timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt:            timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const tenantSubscriptionsTable = pgTable("tenant_subscriptions", {
  id:           text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  tenantId:     text("tenant_id").notNull().references(() => tenantsTable.id),
  planId:       text("plan_id").notNull().references(() => subscriptionPlansTable.id),
  status:       text("status").notNull().default("trial"), // trial, active, expired, cancelled, suspended
  billingCycle: text("billing_cycle").default("monthly"),  // monthly, annual
  startsAt:     timestamp("starts_at", { withTimezone: true }).notNull().defaultNow(),
  expiresAt:    timestamp("expires_at", { withTimezone: true }),
  trialEndsAt:  timestamp("trial_ends_at", { withTimezone: true }),
  cancelledAt:  timestamp("cancelled_at", { withTimezone: true }),
  notes:        text("notes"),
  createdAt:    timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt:    timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export type SubscriptionPlan     = typeof subscriptionPlansTable.$inferSelect;
export type TenantSubscription   = typeof tenantSubscriptionsTable.$inferSelect;
