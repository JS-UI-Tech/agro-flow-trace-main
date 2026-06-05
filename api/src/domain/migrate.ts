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

  // 10. recipes (yield -> yield_text; ingredients/steps as jsonb)
  await pool.query(`
    CREATE TABLE IF NOT EXISTS recipes (
      code text PRIMARY KEY,
      product text,
      version text,
      yield_text text,
      shelf text,
      status text,
      ingredients jsonb DEFAULT '[]'::jsonb,
      steps jsonb DEFAULT '[]'::jsonb,
      created_at timestamptz DEFAULT now()
    )
  `);

  // 11. production_orders (recipeCode -> recipe_code)
  await pool.query(`
    CREATE TABLE IF NOT EXISTS production_orders (
      id text PRIMARY KEY,
      product text,
      recipe_code text,
      line text,
      supervisor text,
      due text,
      status text DEFAULT 'Planned',
      created_at timestamptz DEFAULT now()
    )
  `);

  // 12. packaging_runs (boxes tree as jsonb)
  await pool.query(`
    CREATE TABLE IF NOT EXISTS packaging_runs (
      id text PRIMARY KEY,
      code text,
      batch text,
      product text,
      packaging text,
      mfg text,
      expiry text,
      status text,
      boxes jsonb DEFAULT '[]'::jsonb,
      created_at timestamptz DEFAULT now()
    )
  `);

  // 13. workflow_templates (steps as jsonb)
  await pool.query(`
    CREATE TABLE IF NOT EXISTS workflow_templates (
      id text PRIMARY KEY,
      name text,
      description text,
      category text,
      steps jsonb DEFAULT '[]'::jsonb,
      created_at timestamptz DEFAULT now()
    )
  `);

  // 14. workflow_instances (templateId/currentStep/stepData -> template_id/current_step/step_data)
  await pool.query(`
    CREATE TABLE IF NOT EXISTS workflow_instances (
      id text PRIMARY KEY,
      template_id text,
      assignee text,
      reference text,
      status text,
      current_step integer DEFAULT 0,
      step_data jsonb DEFAULT '{}'::jsonb,
      created_at timestamptz DEFAULT now()
    )
  `);

  // 15. company_config (single config row)
  await pool.query(`
    CREATE TABLE IF NOT EXISTS company_config (
      id text PRIMARY KEY DEFAULT 'default',
      data jsonb DEFAULT '{}'::jsonb,
      updated_at timestamptz DEFAULT now()
    )
  `);

  // Numeric helper columns (idempotent; safe on pre-existing tables).
  await pool.query(`ALTER TABLE production_batches ADD COLUMN IF NOT EXISTS yield_num numeric`);
  await pool.query(`ALTER TABLE production_batches ADD COLUMN IF NOT EXISTS waste_num numeric`);
  await pool.query(`ALTER TABLE dispatches ADD COLUMN IF NOT EXISTS qty_num numeric`);
  await pool.query(`ALTER TABLE waste_records ADD COLUMN IF NOT EXISTS qty_num numeric`);
  await pool.query(`ALTER TABLE finished_goods ADD COLUMN IF NOT EXISTS qty_num numeric`);

  // New-table columns (idempotent; safe on pre-existing tables).
  await pool.query(`ALTER TABLE recipes ADD COLUMN IF NOT EXISTS yield_text text`);
  await pool.query(`ALTER TABLE recipes ADD COLUMN IF NOT EXISTS ingredients jsonb DEFAULT '[]'::jsonb`);
  await pool.query(`ALTER TABLE recipes ADD COLUMN IF NOT EXISTS steps jsonb DEFAULT '[]'::jsonb`);
  await pool.query(`ALTER TABLE production_orders ADD COLUMN IF NOT EXISTS recipe_code text`);
  await pool.query(`ALTER TABLE production_orders ADD COLUMN IF NOT EXISTS status text DEFAULT 'Planned'`);
  await pool.query(`ALTER TABLE packaging_runs ADD COLUMN IF NOT EXISTS boxes jsonb DEFAULT '[]'::jsonb`);
  await pool.query(`ALTER TABLE workflow_templates ADD COLUMN IF NOT EXISTS steps jsonb DEFAULT '[]'::jsonb`);
  await pool.query(`ALTER TABLE workflow_instances ADD COLUMN IF NOT EXISTS template_id text`);
  await pool.query(`ALTER TABLE workflow_instances ADD COLUMN IF NOT EXISTS current_step integer DEFAULT 0`);
  await pool.query(`ALTER TABLE workflow_instances ADD COLUMN IF NOT EXISTS step_data jsonb DEFAULT '{}'::jsonb`);
  await pool.query(`ALTER TABLE company_config ADD COLUMN IF NOT EXISTS data jsonb DEFAULT '{}'::jsonb`);
  await pool.query(`ALTER TABLE company_config ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now()`);

  // Multi-tenancy: every domain table is scoped by organization_id.
  const tenantTables = [
    "suppliers", "raw_materials", "production_batches", "finished_goods",
    "dispatches", "recalls", "qc_checks", "waste_records", "returns",
    "recipes", "production_orders", "packaging_runs", "workflow_templates",
    "workflow_instances", "company_config",
  ];
  for (const t of tenantTables) {
    await pool.query(`ALTER TABLE ${t} ADD COLUMN IF NOT EXISTS organization_id text`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_${t}_org ON ${t} (organization_id)`);
  }
}
