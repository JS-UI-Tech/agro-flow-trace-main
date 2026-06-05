import { Hono } from "hono";
import { z } from "zod";
import { and, eq, desc } from "drizzle-orm";
import { db, productionBatches, finishedGoods, qcChecks } from "../schema";
import { pool } from "../../db";
import { auth } from "../../auth";

export const productionRouter = new Hono();

// ── Session guard: 401 if there is no active session ───────────────────────--
productionRouter.use("*", async (c, next) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  if (!session) return c.json({ error: "Unauthorized" }, 401);
  c.set("userId" as never, session.user.id as never);
  return next();
});

// ── Best-effort audit row (never fails the request) ─────────────────────────-
async function audit(action: string, entityType: string, entityId: string, userId?: string) {
  try {
    await pool.query(
      `INSERT INTO audit_log (action, entity_type, entity_id, user_id, occurred_at)
       VALUES ($1, $2, $3, $4, now())`,
      [action, entityType, entityId, userId ?? null],
    );
  } catch {
    // swallow — audit is best-effort
  }
}

// ── production_batches: translate start_at/end_at/yield_text -> start/end/yield,
//    omit *_num helper columns from the JSON output ─────────────────────────--
function batchOut(r: typeof productionBatches.$inferSelect) {
  return {
    id: r.id,
    product: r.product,
    recipe: r.recipe,
    line: r.line,
    supervisor: r.supervisor,
    start: r.startAt,
    end: r.endAt,
    yield: r.yieldText,
    waste: r.waste,
    status: r.status,
  };
}

function goodsOut(r: typeof finishedGoods.$inferSelect) {
  return {
    id: r.id,
    product: r.product,
    batch: r.batch,
    qty: r.qty,
    location: r.location,
    mfg: r.mfg,
    expiry: r.expiry,
    status: r.status,
  };
}

function qcOut(r: typeof qcChecks.$inferSelect) {
  return {
    id: r.id,
    batch: r.batch,
    checkpoint: r.checkpoint,
    value: r.value,
    limit: r.limit,
    inspector: r.inspector,
    time: r.time,
    status: r.status,
  };
}

// ════════════════════════════════════════════════════════════════════════════
// production-batches  (mock: productionBatches, prefix PB)
// ════════════════════════════════════════════════════════════════════════════
const batchSchema = z
  .object({
    id: z.string().optional(),
    product: z.string().optional(),
    recipe: z.string().optional(),
    line: z.string().optional(),
    supervisor: z.string().optional(),
    start: z.string().optional(),
    end: z.string().optional(),
    yield: z.string().optional(),
    waste: z.string().optional(),
    status: z.string().optional(),
  })
  .partial();

productionRouter.get("/production-batches", async (c) => {
  const orgId = c.get("orgId") as string;
  const rows = await db
    .select()
    .from(productionBatches)
    .where(eq(productionBatches.organizationId, orgId))
    .orderBy(desc(productionBatches.createdAt));
  return c.json(rows.map(batchOut));
});

productionRouter.get("/production-batches/:id", async (c) => {
  const orgId = c.get("orgId") as string;
  const [row] = await db
    .select()
    .from(productionBatches)
    .where(
      and(
        eq(productionBatches.id, c.req.param("id")),
        eq(productionBatches.organizationId, orgId),
      ),
    );
  if (!row) return c.json({ error: "Not found" }, 404);
  return c.json(batchOut(row));
});

productionRouter.post("/production-batches", async (c) => {
  const orgId = c.get("orgId") as string;
  const parsed = batchSchema.safeParse(await c.req.json().catch(() => ({})));
  if (!parsed.success) return c.json({ error: parsed.error.flatten() }, 400);
  const b = parsed.data;
  const id = b.id ?? `PB-${Date.now()}`;
  const [row] = await db
    .insert(productionBatches)
    .values({
      id,
      organizationId: orgId,
      product: b.product,
      recipe: b.recipe,
      line: b.line,
      supervisor: b.supervisor,
      startAt: b.start,
      endAt: b.end,
      yieldText: b.yield,
      waste: b.waste,
      status: b.status,
    })
    .returning();
  await audit("create", "production_batches", id, c.get("userId" as never));
  return c.json(batchOut(row), 201);
});

productionRouter.patch("/production-batches/:id", async (c) => {
  const orgId = c.get("orgId") as string;
  const id = c.req.param("id");
  const parsed = batchSchema.safeParse(await c.req.json().catch(() => ({})));
  if (!parsed.success) return c.json({ error: parsed.error.flatten() }, 400);
  const b = parsed.data;
  const patch: Partial<typeof productionBatches.$inferInsert> = {};
  if (b.product !== undefined) patch.product = b.product;
  if (b.recipe !== undefined) patch.recipe = b.recipe;
  if (b.line !== undefined) patch.line = b.line;
  if (b.supervisor !== undefined) patch.supervisor = b.supervisor;
  if (b.start !== undefined) patch.startAt = b.start;
  if (b.end !== undefined) patch.endAt = b.end;
  if (b.yield !== undefined) patch.yieldText = b.yield;
  if (b.waste !== undefined) patch.waste = b.waste;
  if (b.status !== undefined) patch.status = b.status;
  const [row] = await db
    .update(productionBatches)
    .set(patch)
    .where(and(eq(productionBatches.id, id), eq(productionBatches.organizationId, orgId)))
    .returning();
  if (!row) return c.json({ error: "Not found" }, 404);
  await audit("update", "production_batches", id, c.get("userId" as never));
  return c.json(batchOut(row));
});

// ════════════════════════════════════════════════════════════════════════════
// finished-goods  (mock: finishedGoods, prefix FG)
// ════════════════════════════════════════════════════════════════════════════
const goodsSchema = z
  .object({
    id: z.string().optional(),
    product: z.string().optional(),
    batch: z.string().optional(),
    qty: z.string().optional(),
    location: z.string().optional(),
    mfg: z.string().optional(),
    expiry: z.string().optional(),
    status: z.string().optional(),
  })
  .partial();

productionRouter.get("/finished-goods", async (c) => {
  const orgId = c.get("orgId") as string;
  const rows = await db
    .select()
    .from(finishedGoods)
    .where(eq(finishedGoods.organizationId, orgId))
    .orderBy(desc(finishedGoods.createdAt));
  return c.json(rows.map(goodsOut));
});

productionRouter.get("/finished-goods/:id", async (c) => {
  const orgId = c.get("orgId") as string;
  const [row] = await db
    .select()
    .from(finishedGoods)
    .where(
      and(eq(finishedGoods.id, c.req.param("id")), eq(finishedGoods.organizationId, orgId)),
    );
  if (!row) return c.json({ error: "Not found" }, 404);
  return c.json(goodsOut(row));
});

productionRouter.post("/finished-goods", async (c) => {
  const orgId = c.get("orgId") as string;
  const parsed = goodsSchema.safeParse(await c.req.json().catch(() => ({})));
  if (!parsed.success) return c.json({ error: parsed.error.flatten() }, 400);
  const g = parsed.data;
  const id = g.id ?? `FG-${Date.now()}`;
  const [row] = await db
    .insert(finishedGoods)
    .values({
      id,
      organizationId: orgId,
      product: g.product,
      batch: g.batch,
      qty: g.qty,
      location: g.location,
      mfg: g.mfg,
      expiry: g.expiry,
      status: g.status,
    })
    .returning();
  await audit("create", "finished_goods", id, c.get("userId" as never));
  return c.json(goodsOut(row), 201);
});

productionRouter.patch("/finished-goods/:id", async (c) => {
  const orgId = c.get("orgId") as string;
  const id = c.req.param("id");
  const parsed = goodsSchema.safeParse(await c.req.json().catch(() => ({})));
  if (!parsed.success) return c.json({ error: parsed.error.flatten() }, 400);
  const g = parsed.data;
  const patch: Partial<typeof finishedGoods.$inferInsert> = {};
  if (g.product !== undefined) patch.product = g.product;
  if (g.batch !== undefined) patch.batch = g.batch;
  if (g.qty !== undefined) patch.qty = g.qty;
  if (g.location !== undefined) patch.location = g.location;
  if (g.mfg !== undefined) patch.mfg = g.mfg;
  if (g.expiry !== undefined) patch.expiry = g.expiry;
  if (g.status !== undefined) patch.status = g.status;
  const [row] = await db
    .update(finishedGoods)
    .set(patch)
    .where(and(eq(finishedGoods.id, id), eq(finishedGoods.organizationId, orgId)))
    .returning();
  if (!row) return c.json({ error: "Not found" }, 404);
  await audit("update", "finished_goods", id, c.get("userId" as never));
  return c.json(goodsOut(row));
});

// ════════════════════════════════════════════════════════════════════════════
// qc-checks  (mock: qcChecks, prefix QC)
// ════════════════════════════════════════════════════════════════════════════
const qcSchema = z
  .object({
    id: z.string().optional(),
    batch: z.string().optional(),
    checkpoint: z.string().optional(),
    value: z.string().optional(),
    limit: z.string().optional(),
    inspector: z.string().optional(),
    time: z.string().optional(),
    status: z.string().optional(),
  })
  .partial();

productionRouter.get("/qc-checks", async (c) => {
  const orgId = c.get("orgId") as string;
  const rows = await db
    .select()
    .from(qcChecks)
    .where(eq(qcChecks.organizationId, orgId))
    .orderBy(desc(qcChecks.createdAt));
  return c.json(rows.map(qcOut));
});

productionRouter.get("/qc-checks/:id", async (c) => {
  const orgId = c.get("orgId") as string;
  const [row] = await db
    .select()
    .from(qcChecks)
    .where(and(eq(qcChecks.id, c.req.param("id")), eq(qcChecks.organizationId, orgId)));
  if (!row) return c.json({ error: "Not found" }, 404);
  return c.json(qcOut(row));
});

productionRouter.post("/qc-checks", async (c) => {
  const orgId = c.get("orgId") as string;
  const parsed = qcSchema.safeParse(await c.req.json().catch(() => ({})));
  if (!parsed.success) return c.json({ error: parsed.error.flatten() }, 400);
  const q = parsed.data;
  const id = q.id ?? `QC-${Date.now()}`;
  const [row] = await db
    .insert(qcChecks)
    .values({
      id,
      organizationId: orgId,
      batch: q.batch,
      checkpoint: q.checkpoint,
      value: q.value,
      limit: q.limit,
      inspector: q.inspector,
      time: q.time,
      status: q.status,
    })
    .returning();
  await audit("create", "qc_checks", id, c.get("userId" as never));
  return c.json(qcOut(row), 201);
});

productionRouter.patch("/qc-checks/:id", async (c) => {
  const orgId = c.get("orgId") as string;
  const id = c.req.param("id");
  const parsed = qcSchema.safeParse(await c.req.json().catch(() => ({})));
  if (!parsed.success) return c.json({ error: parsed.error.flatten() }, 400);
  const q = parsed.data;
  const patch: Partial<typeof qcChecks.$inferInsert> = {};
  if (q.batch !== undefined) patch.batch = q.batch;
  if (q.checkpoint !== undefined) patch.checkpoint = q.checkpoint;
  if (q.value !== undefined) patch.value = q.value;
  if (q.limit !== undefined) patch.limit = q.limit;
  if (q.inspector !== undefined) patch.inspector = q.inspector;
  if (q.time !== undefined) patch.time = q.time;
  if (q.status !== undefined) patch.status = q.status;
  const [row] = await db
    .update(qcChecks)
    .set(patch)
    .where(and(eq(qcChecks.id, id), eq(qcChecks.organizationId, orgId)))
    .returning();
  if (!row) return c.json({ error: "Not found" }, 404);
  await audit("update", "qc_checks", id, c.get("userId" as never));
  return c.json(qcOut(row));
});
