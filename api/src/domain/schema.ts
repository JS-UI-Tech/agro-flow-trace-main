import { pgTable, text, numeric, integer, jsonb, timestamp } from "drizzle-orm/pg-core";
import { drizzle } from "drizzle-orm/node-postgres";
import { pool } from "../db";

/**
 * Typed drizzle client over the shared pg pool.
 * Import { db } from this module for all domain queries.
 */
export const db = drizzle(pool);

// ── 1. suppliers ──────────────────────────────────────────────────────────--
export const suppliers = pgTable("suppliers", {
  id: text("id").primaryKey(),
  organizationId: text("organization_id"),
  name: text("name"),
  location: text("location"),
  materials: text("materials"),
  status: text("status"),
  risk: text("risk"),
  cert: text("cert"),
  rejection: text("rejection"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

// ── 2. raw_materials ──────────────────────────────────────────────────────--
export const rawMaterials = pgTable("raw_materials", {
  id: text("id").primaryKey(),
  organizationId: text("organization_id"),
  material: text("material"),
  supplier: text("supplier"),
  lot: text("lot"),
  qty: text("qty"),
  received: text("received"),
  expiry: text("expiry"),
  status: text("status"),
  location: text("location"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

// ── 3. production_batches ──────────────────────────────────────────────────-
// JSON keys start/end/yield map to safe column names start_at/end_at/yield_text.
export const productionBatches = pgTable("production_batches", {
  id: text("id").primaryKey(),
  organizationId: text("organization_id"),
  product: text("product"),
  recipe: text("recipe"),
  line: text("line"),
  supervisor: text("supervisor"),
  startAt: text("start_at"),
  endAt: text("end_at"),
  yieldText: text("yield_text"),
  waste: text("waste"),
  status: text("status"),
  yieldNum: numeric("yield_num"),
  wasteNum: numeric("waste_num"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

// ── 4. finished_goods ─────────────────────────────────────────────────────--
export const finishedGoods = pgTable("finished_goods", {
  id: text("id").primaryKey(),
  organizationId: text("organization_id"),
  product: text("product"),
  batch: text("batch"),
  qty: text("qty"),
  location: text("location"),
  mfg: text("mfg"),
  expiry: text("expiry"),
  status: text("status"),
  qtyNum: numeric("qty_num"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

// ── 5. dispatches ─────────────────────────────────────────────────────────--
export const dispatches = pgTable("dispatches", {
  id: text("id").primaryKey(),
  organizationId: text("organization_id"),
  customer: text("customer"),
  product: text("product"),
  qty: text("qty"),
  vehicle: text("vehicle"),
  driver: text("driver"),
  destination: text("destination"),
  status: text("status"),
  date: text("date"),
  qtyNum: numeric("qty_num"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

// ── 6. recalls ────────────────────────────────────────────────────────────--
export const recalls = pgTable("recalls", {
  id: text("id").primaryKey(),
  organizationId: text("organization_id"),
  product: text("product"),
  batch: text("batch"),
  reason: text("reason"),
  produced: text("produced"),
  dispatched: text("dispatched"),
  recovered: text("recovered"),
  status: text("status"),
  opened: text("opened"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

// ── 7. qc_checks ──────────────────────────────────────────────────────────--
export const qcChecks = pgTable("qc_checks", {
  id: text("id").primaryKey(),
  organizationId: text("organization_id"),
  batch: text("batch"),
  checkpoint: text("checkpoint"),
  value: text("value"),
  limit: text("limit"),
  inspector: text("inspector"),
  time: text("time"),
  status: text("status"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

// ── 8. waste_records ──────────────────────────────────────────────────────--
export const wasteRecords = pgTable("waste_records", {
  id: text("id").primaryKey(),
  organizationId: text("organization_id"),
  source: text("source"),
  material: text("material"),
  qty: text("qty"),
  reason: text("reason"),
  disposal: text("disposal"),
  date: text("date"),
  status: text("status"),
  qtyNum: numeric("qty_num"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

// ── 9. returns ────────────────────────────────────────────────────────────--
export const returns = pgTable("returns", {
  id: text("id").primaryKey(),
  organizationId: text("organization_id"),
  customer: text("customer"),
  product: text("product"),
  batch: text("batch"),
  qty: text("qty"),
  reason: text("reason"),
  decision: text("decision"),
  date: text("date"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

// ── 10. recipes ───────────────────────────────────────────────────────────--
// JSON key "yield" maps to safe column name yield_text. Nested arrays as jsonb.
export const recipes = pgTable("recipes", {
  code: text("code").primaryKey(),
  organizationId: text("organization_id"),
  product: text("product"),
  version: text("version"),
  yieldText: text("yield_text"),
  shelf: text("shelf"),
  status: text("status"),
  ingredients: jsonb("ingredients").$type<unknown[]>().default([]),
  steps: jsonb("steps").$type<unknown[]>().default([]),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

// ── 11. production_orders ──────────────────────────────────────────────────-
// JSON key "recipeCode" maps to column recipe_code.
export const productionOrders = pgTable("production_orders", {
  id: text("id").primaryKey(),
  organizationId: text("organization_id"),
  product: text("product"),
  recipeCode: text("recipe_code"),
  line: text("line"),
  supervisor: text("supervisor"),
  due: text("due"),
  status: text("status").default("Planned"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

// ── 12. packaging_runs ─────────────────────────────────────────────────────-
// Nested boxes/products tree stored as jsonb.
export const packagingRuns = pgTable("packaging_runs", {
  id: text("id").primaryKey(),
  organizationId: text("organization_id"),
  code: text("code"),
  batch: text("batch"),
  product: text("product"),
  packaging: text("packaging"),
  mfg: text("mfg"),
  expiry: text("expiry"),
  status: text("status"),
  boxes: jsonb("boxes").$type<unknown[]>().default([]),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

// ── 13. workflow_templates ─────────────────────────────────────────────────-
// steps is an array of step keys stored as jsonb.
export const workflowTemplates = pgTable("workflow_templates", {
  id: text("id").primaryKey(),
  organizationId: text("organization_id"),
  name: text("name"),
  description: text("description"),
  category: text("category"),
  steps: jsonb("steps").$type<unknown[]>().default([]),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

// ── 14. workflow_instances ─────────────────────────────────────────────────-
// JSON keys templateId/currentStep/stepData map to template_id/current_step/step_data.
export const workflowInstances = pgTable("workflow_instances", {
  id: text("id").primaryKey(),
  organizationId: text("organization_id"),
  templateId: text("template_id"),
  assignee: text("assignee"),
  reference: text("reference"),
  status: text("status"),
  currentStep: integer("current_step").default(0),
  stepData: jsonb("step_data").$type<Record<string, unknown>>().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

// ── 15. company_config ─────────────────────────────────────────────────────-
// Single config row keyed by id (default 'default').
export const companyConfig = pgTable("company_config", {
  id: text("id").primaryKey().default("default"),
  organizationId: text("organization_id"),
  data: jsonb("data").$type<Record<string, unknown>>().default({}),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});
