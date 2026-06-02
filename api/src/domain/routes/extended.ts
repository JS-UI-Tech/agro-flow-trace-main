import { Hono } from "hono";
import { z } from "zod";
import { desc, eq } from "drizzle-orm";
import {
  db,
  recipes,
  productionOrders,
  packagingRuns,
  workflowTemplates,
  workflowInstances,
  companyConfig,
  suppliers,
  rawMaterials,
  productionBatches,
  finishedGoods,
  dispatches,
  recalls,
  qcChecks,
  wasteRecords,
} from "../schema";
import { pool } from "../../db";
import { auth } from "../../auth";

/**
 * Extended domain routes: recipes, production orders, packaging runs, workflow
 * templates/instances, company config, the real audit trail, traceability and
 * computed report summaries. Every route requires a valid better-auth session.
 */
export const extendedRouter = new Hono();

// ── Session guard: 401 if there is no active session ───────────────────────--
extendedRouter.use("*", async (c, next) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  if (!session) return c.json({ error: "Unauthorized" }, 401);
  c.set("userId" as never, session.user.id as never);
  await next();
});

// ── Best-effort audit (never fails the request) ────────────────────────────--
async function audit(action: string, entityType: string, entityId: string, userId?: string) {
  try {
    await pool.query(
      `INSERT INTO audit_log (action, entity_type, entity_id, user_id, occurred_at)
       VALUES ($1, $2, $3, $4, now())`,
      [action, entityType, entityId, userId ?? null],
    );
  } catch {
    // swallow: audit is best-effort
  }
}

// Parse the leading number out of a text quantity ("4,800 L" -> 4800).
function leadingNum(v: unknown): number {
  if (v == null) return 0;
  const m = String(v).replace(/,/g, "").match(/-?\d+(\.\d+)?/);
  return m ? Number(m[0]) : 0;
}

// ════════════════════════════════════════════════════════════════════════════
// recipes  (pk = "code"; yield_text -> "yield"; ingredients/steps as jsonb)
// ════════════════════════════════════════════════════════════════════════════
function recipeOut(r: typeof recipes.$inferSelect) {
  return {
    code: r.code,
    product: r.product,
    version: r.version,
    yield: r.yieldText,
    shelf: r.shelf,
    status: r.status,
    ingredients: r.ingredients ?? [],
    steps: r.steps ?? [],
  };
}

const recipeSchema = z
  .object({
    code: z.string().optional(),
    product: z.string().optional(),
    version: z.string().optional(),
    yield: z.string().optional(),
    shelf: z.string().optional(),
    status: z.string().optional(),
    ingredients: z.array(z.any()).optional(),
    steps: z.array(z.any()).optional(),
  })
  .partial();

extendedRouter.get("/recipes", async (c) => {
  const rows = await db.select().from(recipes).orderBy(desc(recipes.createdAt));
  return c.json(rows.map(recipeOut));
});

extendedRouter.get("/recipes/:id", async (c) => {
  const [row] = await db.select().from(recipes).where(eq(recipes.code, c.req.param("id")));
  if (!row) return c.json({ error: "Not found" }, 404);
  return c.json(recipeOut(row));
});

extendedRouter.post("/recipes", async (c) => {
  const parsed = recipeSchema.safeParse(await c.req.json().catch(() => ({})));
  if (!parsed.success) return c.json({ error: parsed.error.flatten() }, 400);
  const r = parsed.data;
  const code = r.code ?? `REC-${Date.now()}`;
  const [row] = await db
    .insert(recipes)
    .values({
      code,
      product: r.product,
      version: r.version,
      yieldText: r.yield,
      shelf: r.shelf,
      status: r.status,
      ingredients: r.ingredients ?? [],
      steps: r.steps ?? [],
    })
    .returning();
  await audit("create", "recipes", code, c.get("userId" as never));
  return c.json(recipeOut(row), 201);
});

extendedRouter.patch("/recipes/:id", async (c) => {
  const code = c.req.param("id");
  const parsed = recipeSchema.safeParse(await c.req.json().catch(() => ({})));
  if (!parsed.success) return c.json({ error: parsed.error.flatten() }, 400);
  const r = parsed.data;
  const patch: Partial<typeof recipes.$inferInsert> = {};
  if (r.product !== undefined) patch.product = r.product;
  if (r.version !== undefined) patch.version = r.version;
  if (r.yield !== undefined) patch.yieldText = r.yield;
  if (r.shelf !== undefined) patch.shelf = r.shelf;
  if (r.status !== undefined) patch.status = r.status;
  if (r.ingredients !== undefined) patch.ingredients = r.ingredients;
  if (r.steps !== undefined) patch.steps = r.steps;
  const [row] = await db.update(recipes).set(patch).where(eq(recipes.code, code)).returning();
  if (!row) return c.json({ error: "Not found" }, 404);
  await audit("update", "recipes", code, c.get("userId" as never));
  return c.json(recipeOut(row));
});

// ════════════════════════════════════════════════════════════════════════════
// production-orders  (recipe_code -> "recipeCode")
// ════════════════════════════════════════════════════════════════════════════
function orderOut(r: typeof productionOrders.$inferSelect) {
  return {
    id: r.id,
    product: r.product,
    recipeCode: r.recipeCode,
    line: r.line,
    supervisor: r.supervisor,
    due: r.due,
    status: r.status,
  };
}

const orderSchema = z
  .object({
    id: z.string().optional(),
    product: z.string().optional(),
    recipeCode: z.string().optional(),
    line: z.string().optional(),
    supervisor: z.string().optional(),
    due: z.string().optional(),
    status: z.string().optional(),
  })
  .partial();

extendedRouter.get("/production-orders", async (c) => {
  const rows = await db.select().from(productionOrders).orderBy(desc(productionOrders.createdAt));
  return c.json(rows.map(orderOut));
});

extendedRouter.get("/production-orders/:id", async (c) => {
  const [row] = await db
    .select()
    .from(productionOrders)
    .where(eq(productionOrders.id, c.req.param("id")));
  if (!row) return c.json({ error: "Not found" }, 404);
  return c.json(orderOut(row));
});

extendedRouter.post("/production-orders", async (c) => {
  const parsed = orderSchema.safeParse(await c.req.json().catch(() => ({})));
  if (!parsed.success) return c.json({ error: parsed.error.flatten() }, 400);
  const o = parsed.data;
  const id = o.id ?? `PO-${Date.now()}`;
  const [row] = await db
    .insert(productionOrders)
    .values({
      id,
      product: o.product,
      recipeCode: o.recipeCode,
      line: o.line,
      supervisor: o.supervisor,
      due: o.due,
      status: o.status,
    })
    .returning();
  await audit("create", "production_orders", id, c.get("userId" as never));
  return c.json(orderOut(row), 201);
});

extendedRouter.patch("/production-orders/:id", async (c) => {
  const id = c.req.param("id");
  const parsed = orderSchema.safeParse(await c.req.json().catch(() => ({})));
  if (!parsed.success) return c.json({ error: parsed.error.flatten() }, 400);
  const o = parsed.data;
  const patch: Partial<typeof productionOrders.$inferInsert> = {};
  if (o.product !== undefined) patch.product = o.product;
  if (o.recipeCode !== undefined) patch.recipeCode = o.recipeCode;
  if (o.line !== undefined) patch.line = o.line;
  if (o.supervisor !== undefined) patch.supervisor = o.supervisor;
  if (o.due !== undefined) patch.due = o.due;
  if (o.status !== undefined) patch.status = o.status;
  const [row] = await db
    .update(productionOrders)
    .set(patch)
    .where(eq(productionOrders.id, id))
    .returning();
  if (!row) return c.json({ error: "Not found" }, 404);
  await audit("update", "production_orders", id, c.get("userId" as never));
  return c.json(orderOut(row));
});

// ════════════════════════════════════════════════════════════════════════════
// packaging-runs  (boxes tree as jsonb)
// ════════════════════════════════════════════════════════════════════════════
function runOut(r: typeof packagingRuns.$inferSelect) {
  return {
    id: r.id,
    code: r.code,
    batch: r.batch,
    product: r.product,
    packaging: r.packaging,
    mfg: r.mfg,
    expiry: r.expiry,
    status: r.status,
    boxes: r.boxes ?? [],
  };
}

const runSchema = z
  .object({
    id: z.string().optional(),
    code: z.string().optional(),
    batch: z.string().optional(),
    product: z.string().optional(),
    packaging: z.string().optional(),
    mfg: z.string().optional(),
    expiry: z.string().optional(),
    status: z.string().optional(),
    boxes: z.array(z.any()).optional(),
  })
  .partial();

extendedRouter.get("/packaging-runs", async (c) => {
  const rows = await db.select().from(packagingRuns).orderBy(desc(packagingRuns.createdAt));
  return c.json(rows.map(runOut));
});

extendedRouter.get("/packaging-runs/:id", async (c) => {
  const [row] = await db.select().from(packagingRuns).where(eq(packagingRuns.id, c.req.param("id")));
  if (!row) return c.json({ error: "Not found" }, 404);
  return c.json(runOut(row));
});

extendedRouter.post("/packaging-runs", async (c) => {
  const parsed = runSchema.safeParse(await c.req.json().catch(() => ({})));
  if (!parsed.success) return c.json({ error: parsed.error.flatten() }, 400);
  const r = parsed.data;
  const id = r.id ?? `PR-${Date.now()}`;
  const [row] = await db
    .insert(packagingRuns)
    .values({
      id,
      code: r.code ?? id,
      batch: r.batch,
      product: r.product,
      packaging: r.packaging,
      mfg: r.mfg,
      expiry: r.expiry,
      status: r.status,
      boxes: r.boxes ?? [],
    })
    .returning();
  await audit("create", "packaging_runs", id, c.get("userId" as never));
  return c.json(runOut(row), 201);
});

extendedRouter.patch("/packaging-runs/:id", async (c) => {
  const id = c.req.param("id");
  const parsed = runSchema.safeParse(await c.req.json().catch(() => ({})));
  if (!parsed.success) return c.json({ error: parsed.error.flatten() }, 400);
  const r = parsed.data;
  const patch: Partial<typeof packagingRuns.$inferInsert> = {};
  if (r.code !== undefined) patch.code = r.code;
  if (r.batch !== undefined) patch.batch = r.batch;
  if (r.product !== undefined) patch.product = r.product;
  if (r.packaging !== undefined) patch.packaging = r.packaging;
  if (r.mfg !== undefined) patch.mfg = r.mfg;
  if (r.expiry !== undefined) patch.expiry = r.expiry;
  if (r.status !== undefined) patch.status = r.status;
  if (r.boxes !== undefined) patch.boxes = r.boxes;
  const [row] = await db
    .update(packagingRuns)
    .set(patch)
    .where(eq(packagingRuns.id, id))
    .returning();
  if (!row) return c.json({ error: "Not found" }, 404);
  await audit("update", "packaging_runs", id, c.get("userId" as never));
  return c.json(runOut(row));
});

// ════════════════════════════════════════════════════════════════════════════
// workflow-templates  (steps as jsonb)
// ════════════════════════════════════════════════════════════════════════════
function templateOut(r: typeof workflowTemplates.$inferSelect) {
  return {
    id: r.id,
    name: r.name,
    description: r.description,
    category: r.category,
    steps: r.steps ?? [],
  };
}

const templateSchema = z
  .object({
    id: z.string().optional(),
    name: z.string().optional(),
    description: z.string().optional(),
    category: z.string().optional(),
    steps: z.array(z.any()).optional(),
  })
  .partial();

extendedRouter.get("/workflow-templates", async (c) => {
  const rows = await db.select().from(workflowTemplates).orderBy(desc(workflowTemplates.createdAt));
  return c.json(rows.map(templateOut));
});

extendedRouter.get("/workflow-templates/:id", async (c) => {
  const [row] = await db
    .select()
    .from(workflowTemplates)
    .where(eq(workflowTemplates.id, c.req.param("id")));
  if (!row) return c.json({ error: "Not found" }, 404);
  return c.json(templateOut(row));
});

extendedRouter.post("/workflow-templates", async (c) => {
  const parsed = templateSchema.safeParse(await c.req.json().catch(() => ({})));
  if (!parsed.success) return c.json({ error: parsed.error.flatten() }, 400);
  const t = parsed.data;
  const id = t.id ?? `WT-${Date.now()}`;
  const [row] = await db
    .insert(workflowTemplates)
    .values({
      id,
      name: t.name,
      description: t.description,
      category: t.category,
      steps: t.steps ?? [],
    })
    .returning();
  await audit("create", "workflow_templates", id, c.get("userId" as never));
  return c.json(templateOut(row), 201);
});

extendedRouter.patch("/workflow-templates/:id", async (c) => {
  const id = c.req.param("id");
  const parsed = templateSchema.safeParse(await c.req.json().catch(() => ({})));
  if (!parsed.success) return c.json({ error: parsed.error.flatten() }, 400);
  const t = parsed.data;
  const patch: Partial<typeof workflowTemplates.$inferInsert> = {};
  if (t.name !== undefined) patch.name = t.name;
  if (t.description !== undefined) patch.description = t.description;
  if (t.category !== undefined) patch.category = t.category;
  if (t.steps !== undefined) patch.steps = t.steps;
  const [row] = await db
    .update(workflowTemplates)
    .set(patch)
    .where(eq(workflowTemplates.id, id))
    .returning();
  if (!row) return c.json({ error: "Not found" }, 404);
  await audit("update", "workflow_templates", id, c.get("userId" as never));
  return c.json(templateOut(row));
});

// ════════════════════════════════════════════════════════════════════════════
// workflow-instances  (template_id/current_step/step_data -> templateId/...)
// ════════════════════════════════════════════════════════════════════════════
function instanceOut(r: typeof workflowInstances.$inferSelect) {
  return {
    id: r.id,
    templateId: r.templateId,
    assignee: r.assignee,
    reference: r.reference,
    status: r.status,
    currentStep: r.currentStep ?? 0,
    stepData: r.stepData ?? {},
  };
}

const instanceSchema = z
  .object({
    id: z.string().optional(),
    templateId: z.string().optional(),
    assignee: z.string().optional(),
    reference: z.string().optional(),
    status: z.string().optional(),
    currentStep: z.number().int().optional(),
    stepData: z.record(z.any()).optional(),
  })
  .partial();

extendedRouter.get("/workflow-instances", async (c) => {
  const rows = await db.select().from(workflowInstances).orderBy(desc(workflowInstances.createdAt));
  return c.json(rows.map(instanceOut));
});

extendedRouter.get("/workflow-instances/:id", async (c) => {
  const [row] = await db
    .select()
    .from(workflowInstances)
    .where(eq(workflowInstances.id, c.req.param("id")));
  if (!row) return c.json({ error: "Not found" }, 404);
  return c.json(instanceOut(row));
});

extendedRouter.post("/workflow-instances", async (c) => {
  const parsed = instanceSchema.safeParse(await c.req.json().catch(() => ({})));
  if (!parsed.success) return c.json({ error: parsed.error.flatten() }, 400);
  const i = parsed.data;
  const id = i.id ?? `WF-${Date.now()}`;
  const [row] = await db
    .insert(workflowInstances)
    .values({
      id,
      templateId: i.templateId,
      assignee: i.assignee,
      reference: i.reference,
      status: i.status,
      currentStep: i.currentStep ?? 0,
      stepData: i.stepData ?? {},
    })
    .returning();
  await audit("create", "workflow_instances", id, c.get("userId" as never));
  return c.json(instanceOut(row), 201);
});

extendedRouter.patch("/workflow-instances/:id", async (c) => {
  const id = c.req.param("id");
  const parsed = instanceSchema.safeParse(await c.req.json().catch(() => ({})));
  if (!parsed.success) return c.json({ error: parsed.error.flatten() }, 400);
  const i = parsed.data;
  const patch: Partial<typeof workflowInstances.$inferInsert> = {};
  if (i.templateId !== undefined) patch.templateId = i.templateId;
  if (i.assignee !== undefined) patch.assignee = i.assignee;
  if (i.reference !== undefined) patch.reference = i.reference;
  if (i.status !== undefined) patch.status = i.status;
  if (i.currentStep !== undefined) patch.currentStep = i.currentStep;
  if (i.stepData !== undefined) patch.stepData = i.stepData;
  const [row] = await db
    .update(workflowInstances)
    .set(patch)
    .where(eq(workflowInstances.id, id))
    .returning();
  if (!row) return c.json({ error: "Not found" }, 404);
  await audit("update", "workflow_instances", id, c.get("userId" as never));
  return c.json(instanceOut(row));
});

// ════════════════════════════════════════════════════════════════════════════
// company-config  (single row keyed by 'default')
// ════════════════════════════════════════════════════════════════════════════
const configSchema = z.record(z.any());

extendedRouter.get("/company-config", async (c) => {
  const [row] = await db
    .select()
    .from(companyConfig)
    .where(eq(companyConfig.id, "default"));
  return c.json((row?.data as Record<string, unknown>) ?? { sections: [] });
});

extendedRouter.put("/company-config", async (c) => {
  const parsed = configSchema.safeParse(await c.req.json().catch(() => ({})));
  if (!parsed.success) return c.json({ error: parsed.error.flatten() }, 400);
  const data = parsed.data;
  const [row] = await db
    .insert(companyConfig)
    .values({ id: "default", data, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: companyConfig.id,
      set: { data, updatedAt: new Date() },
    })
    .returning();
  await audit("update", "company_config", "default", c.get("userId" as never));
  return c.json((row?.data as Record<string, unknown>) ?? data);
});

// ════════════════════════════════════════════════════════════════════════════
// audit  (the real audit trail; resilient if audit_log does not exist)
// ════════════════════════════════════════════════════════════════════════════
extendedRouter.get("/audit", async (c) => {
  const limit = Math.min(Math.max(Number(c.req.query("limit")) || 100, 1), 1000);
  try {
    const r = await pool.query(
      `SELECT action, entity_type, entity_id, user_id, occurred_at
         FROM audit_log
        ORDER BY occurred_at DESC
        LIMIT $1`,
      [limit],
    );
    return c.json(
      r.rows.map((row) => ({
        action: row.action,
        entityType: row.entity_type,
        entityId: row.entity_id,
        user: row.user_id,
        time: row.occurred_at,
      })),
    );
  } catch {
    // audit_log may not exist yet — surface an empty trail instead of erroring.
    return c.json([]);
  }
});

// ════════════════════════════════════════════════════════════════════════════
// trace/:code  (pragmatic traceability lookup across the domain tables)
// ════════════════════════════════════════════════════════════════════════════
extendedRouter.get("/trace/:code", async (c) => {
  const code = c.req.param("code");
  const matches: { type: string; record: unknown }[] = [];
  const related: { type: string; record: unknown }[] = [];

  // Direct matches by primary id (and obvious code/batch columns).
  const [
    supplierRows,
    rawRows,
    batchRows,
    goodsRows,
    dispatchRows,
    recallRows,
  ] = await Promise.all([
    db.select().from(suppliers).where(eq(suppliers.id, code)),
    db.select().from(rawMaterials).where(eq(rawMaterials.id, code)),
    db.select().from(productionBatches).where(eq(productionBatches.id, code)),
    db.select().from(finishedGoods).where(eq(finishedGoods.id, code)),
    db.select().from(dispatches).where(eq(dispatches.id, code)),
    db.select().from(recalls).where(eq(recalls.id, code)),
  ]);

  for (const r of supplierRows) matches.push({ type: "supplier", record: r });
  for (const r of rawRows) matches.push({ type: "raw_material", record: r });
  for (const r of batchRows) matches.push({ type: "production_batch", record: r });
  for (const r of goodsRows) matches.push({ type: "finished_good", record: r });
  for (const r of dispatchRows) matches.push({ type: "dispatch", record: r });
  for (const r of recallRows) matches.push({ type: "recall", record: r });

  // Determine which batch id to fan out from: the code itself if it is a batch,
  // otherwise the batch field on a matched finished good / recall.
  const batchIds = new Set<string>();
  if (batchRows.length) batchIds.add(code);
  for (const r of goodsRows) if (r.batch) batchIds.add(r.batch);
  for (const r of recallRows) if (r.batch) batchIds.add(r.batch);

  // For each linked batch, gather downstream/related records by the batch fk.
  for (const batchId of batchIds) {
    const [linkedGoods, linkedRecalls, linkedQc, linkedReturns, batchRow] =
      await Promise.all([
        db.select().from(finishedGoods).where(eq(finishedGoods.batch, batchId)),
        db.select().from(recalls).where(eq(recalls.batch, batchId)),
        db.select().from(qcChecks).where(eq(qcChecks.batch, batchId)),
        db.select().from(productionBatches).where(eq(productionBatches.id, batchId)),
        db.select().from(packagingRuns).where(eq(packagingRuns.batch, batchId)),
      ]);

    for (const r of batchRow) related.push({ type: "production_batch", record: r });
    for (const r of linkedGoods) {
      related.push({ type: "finished_good", record: r });
      // Dispatches reference goods by product; link by product as a best effort.
      if (r.product) {
        const linkedDispatch = await db
          .select()
          .from(dispatches)
          .where(eq(dispatches.product, r.product));
        for (const d of linkedDispatch) related.push({ type: "dispatch", record: d });
      }
    }
    for (const r of linkedRecalls) related.push({ type: "recall", record: r });
    for (const r of linkedQc) related.push({ type: "qc_check", record: r });
    for (const r of linkedReturns) related.push({ type: "packaging_run", record: r });
  }

  return c.json({ code, matches, related });
});

// ════════════════════════════════════════════════════════════════════════════
// reports  (computed summaries derived from the domain tables)
// ════════════════════════════════════════════════════════════════════════════
extendedRouter.get("/reports", async (c) => {
  const [
    productionVolume,
    qcCounts,
    dispatchVolume,
    wasteTotal,
    supplierRejection,
  ] = await Promise.all([
    pool
      .query(`SELECT COALESCE(sum(yield_num), 0)::float AS n FROM production_batches`)
      .then((r) => r.rows[0]?.n ?? 0),
    pool
      .query(
        `SELECT
           count(*) FILTER (WHERE status ILIKE 'Pass')::int AS pass,
           count(*)::int AS total
         FROM qc_checks`,
      )
      .then((r) => ({ pass: r.rows[0]?.pass ?? 0, total: r.rows[0]?.total ?? 0 })),
    pool
      .query(`SELECT COALESCE(sum(qty_num), 0)::float AS n FROM dispatches`)
      .then((r) => r.rows[0]?.n ?? 0),
    pool
      .query(`SELECT COALESCE(sum(qty_num), 0)::float AS n FROM waste_records`)
      .then((r) => r.rows[0]?.n ?? 0),
    pool
      .query(`SELECT rejection FROM suppliers`)
      .then((r) => {
        const vals = r.rows.map((row) => leadingNum(row.rejection)).filter((n) => !Number.isNaN(n));
        if (!vals.length) return 0;
        return Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10;
      }),
  ]);

  const qcPassRate =
    qcCounts.total > 0 ? Math.round((qcCounts.pass / qcCounts.total) * 1000) / 10 : 0;

  return c.json([
    { id: "production-volume", title: "Production volume", metric: "total yield", value: productionVolume },
    { id: "qc-pass-rate", title: "QC pass rate", metric: "% passed", value: qcPassRate },
    { id: "dispatch-volume", title: "Dispatch volume", metric: "total dispatched", value: dispatchVolume },
    { id: "waste-total", title: "Waste totals", metric: "total waste", value: wasteTotal },
    { id: "supplier-rejection", title: "Supplier rejection", metric: "avg rejection %", value: supplierRejection },
  ]);
});
