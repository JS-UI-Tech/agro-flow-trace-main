import { pool } from "../db";

/**
 * Idempotent domain schema bootstrap. Safe to run on every boot.
 * Creates the 9 domain tables (if missing) and ensures the numeric
 * helper columns exist via ADD COLUMN IF NOT EXISTS.
 */
export async function migrateDomain(): Promise<void> {
  // 1. suppliers
  await pool.query(`
    CREATE TABLE IF NOT EXISTS suppliers (
      id text PRIMARY KEY,
      name text,
      location text,
      materials text,
      status text,
      risk text,
      cert text,
      rejection text,
      created_at timestamptz DEFAULT now()
    )
  `);

  // 2. raw_materials
  await pool.query(`
    CREATE TABLE IF NOT EXISTS raw_materials (
      id text PRIMARY KEY,
      material text,
      supplier text,
      lot text,
      qty text,
      received text,
      expiry text,
      status text,
      location text,
      created_at timestamptz DEFAULT now()
    )
  `);

  // 3. production_batches
  await pool.query(`
    CREATE TABLE IF NOT EXISTS production_batches (
      id text PRIMARY KEY,
      product text,
      recipe text,
      line text,
      supervisor text,
      start_at text,
      end_at text,
      yield_text text,
      waste text,
      status text,
      yield_num numeric,
      waste_num numeric,
      created_at timestamptz DEFAULT now()
    )
  `);

  // 4. finished_goods
  await pool.query(`
    CREATE TABLE IF NOT EXISTS finished_goods (
      id text PRIMARY KEY,
      product text,
      batch text,
      qty text,
      location text,
      mfg text,
      expiry text,
      status text,
      qty_num numeric,
      created_at timestamptz DEFAULT now()
    )
  `);

  // 5. dispatches
  await pool.query(`
    CREATE TABLE IF NOT EXISTS dispatches (
      id text PRIMARY KEY,
      customer text,
      product text,
      qty text,
      vehicle text,
      driver text,
      destination text,
      status text,
      date text,
      qty_num numeric,
      created_at timestamptz DEFAULT now()
    )
  `);

  // 6. recalls
  await pool.query(`
    CREATE TABLE IF NOT EXISTS recalls (
      id text PRIMARY KEY,
      product text,
      batch text,
      reason text,
      produced text,
      dispatched text,
      recovered text,
      status text,
      opened text,
      created_at timestamptz DEFAULT now()
    )
  `);

  // 7. qc_checks
  await pool.query(`
    CREATE TABLE IF NOT EXISTS qc_checks (
      id text PRIMARY KEY,
      batch text,
      checkpoint text,
      value text,
      "limit" text,
      inspector text,
      time text,
      status text,
      created_at timestamptz DEFAULT now()
    )
  `);

  // 8. waste_records
  await pool.query(`
    CREATE TABLE IF NOT EXISTS waste_records (
      id text PRIMARY KEY,
      source text,
      material text,
      qty text,
      reason text,
      disposal text,
      date text,
      status text,
      qty_num numeric,
      created_at timestamptz DEFAULT now()
    )
  `);

  // 9. returns
  await pool.query(`
    CREATE TABLE IF NOT EXISTS returns (
      id text PRIMARY KEY,
      customer text,
      product text,
      batch text,
      qty text,
      reason text,
      decision text,
      date text,
      created_at timestamptz DEFAULT now()
    )
  `);

  // Numeric helper columns (idempotent; safe on pre-existing tables).
  await pool.query(`ALTER TABLE production_batches ADD COLUMN IF NOT EXISTS yield_num numeric`);
  await pool.query(`ALTER TABLE production_batches ADD COLUMN IF NOT EXISTS waste_num numeric`);
  await pool.query(`ALTER TABLE dispatches ADD COLUMN IF NOT EXISTS qty_num numeric`);
  await pool.query(`ALTER TABLE waste_records ADD COLUMN IF NOT EXISTS qty_num numeric`);
  await pool.query(`ALTER TABLE finished_goods ADD COLUMN IF NOT EXISTS qty_num numeric`);
}
