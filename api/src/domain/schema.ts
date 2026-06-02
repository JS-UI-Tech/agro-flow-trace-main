import { pgTable, text, numeric, timestamp } from "drizzle-orm/pg-core";
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
  customer: text("customer"),
  product: text("product"),
  batch: text("batch"),
  qty: text("qty"),
  reason: text("reason"),
  decision: text("decision"),
  date: text("date"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});
