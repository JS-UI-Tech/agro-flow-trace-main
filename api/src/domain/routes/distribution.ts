import { Hono } from "hono";
import { z } from "zod";
import { and, desc, eq } from "drizzle-orm";
import { db, dispatches, recalls, wasteRecords, returns } from "../schema";
import { pool } from "../../db";
import { auth } from "../../auth";

/**
 * Distribution domain routes: dispatches, recalls, waste-records, returns.
 * All routes require a valid better-auth session.
 */
export const distributionRouter = new Hono();

// ── Session guard ──────────────────────────────────────────────────────────-
distributionRouter.use("*", async (c, next) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  if (!session) return c.json({ error: "Unauthorized" }, 401);
  c.set("userId" as never, session.user.id as never);
  await next();
});

// ── Best-effort audit (never fails the request) ────────────────────────────--
async function audit(action: string, entityType: string, entityId: string, userId?: string) {
  try {
    await pool.query(
      `insert into audit_log (action, entity_type, entity_id, user_id, occurred_at)
       values ($1, $2, $3, $4, now())`,
      [action, entityType, entityId, userId ?? null],
    );
  } catch {
    // swallow: audit is best-effort
  }
}

const dispatchSchema = z
  .object({
    id: z.string().optional(),
    customer: z.string().optional(),
    product: z.string().optional(),
    qty: z.string().optional(),
    vehicle: z.string().optional(),
    driver: z.string().optional(),
    destination: z.string().optional(),
    status: z.string().optional(),
    date: z.string().optional(),
  })
  ;

const recallSchema = z
  .object({
    id: z.string().optional(),
    product: z.string().optional(),
    batch: z.string().optional(),
    reason: z.string().optional(),
    produced: z.string().optional(),
    dispatched: z.string().optional(),
    recovered: z.string().optional(),
    status: z.string().optional(),
    opened: z.string().optional(),
  })
  ;

const wasteRecordSchema = z
  .object({
    id: z.string().optional(),
    source: z.string().optional(),
    material: z.string().optional(),
    qty: z.string().optional(),
    reason: z.string().optional(),
    disposal: z.string().optional(),
    date: z.string().optional(),
    status: z.string().optional(),
  })
  ;

const returnSchema = z
  .object({
    id: z.string().optional(),
    customer: z.string().optional(),
    product: z.string().optional(),
    batch: z.string().optional(),
    qty: z.string().optional(),
    reason: z.string().optional(),
    decision: z.string().optional(),
    date: z.string().optional(),
  })
  ;

// Strip dashboard-only helper columns from the entity JSON.
const stripQtyNum = ({ qtyNum, ...rest }: Record<string, unknown>) => rest;

// ── dispatches ─────────────────────────────────────────────────────────────-
distributionRouter.get("/dispatches", async (c) => {
  const orgId = c.get("orgId") as string;
  const rows = await db
    .select()
    .from(dispatches)
    .where(eq(dispatches.organizationId, orgId))
    .orderBy(desc(dispatches.createdAt));
  return c.json(rows.map(stripQtyNum));
});

distributionRouter.get("/dispatches/:id", async (c) => {
  const orgId = c.get("orgId") as string;
  const [row] = await db
    .select()
    .from(dispatches)
    .where(and(eq(dispatches.id, c.req.param("id")), eq(dispatches.organizationId, orgId)));
  if (!row) return c.json({ error: "Not found" }, 404);
  return c.json(stripQtyNum(row));
});

distributionRouter.post("/dispatches", async (c) => {
  const orgId = c.get("orgId") as string;
  const parsed = dispatchSchema.safeParse(await c.req.json().catch(() => ({})));
  if (!parsed.success) return c.json({ error: parsed.error.flatten() }, 400);
  const id = parsed.data.id ?? `DSP-${Date.now()}`;
  const [row] = await db
    .insert(dispatches)
    .values({ ...parsed.data, id, organizationId: orgId })
    .returning();
  await audit("create", "dispatches", id, c.get("userId" as never));
  return c.json(stripQtyNum(row), 201);
});

distributionRouter.patch("/dispatches/:id", async (c) => {
  const orgId = c.get("orgId") as string;
  const id = c.req.param("id");
  const parsed = dispatchSchema.partial().safeParse(await c.req.json().catch(() => ({})));
  if (!parsed.success) return c.json({ error: parsed.error.flatten() }, 400);
  const { id: _omit, ...patch } = parsed.data;
  const [row] = await db
    .update(dispatches)
    .set(patch)
    .where(and(eq(dispatches.id, id), eq(dispatches.organizationId, orgId)))
    .returning();
  if (!row) return c.json({ error: "Not found" }, 404);
  await audit("update", "dispatches", id, c.get("userId" as never));
  return c.json(stripQtyNum(row));
});

// ── recalls ────────────────────────────────────────────────────────────────-
distributionRouter.get("/recalls", async (c) => {
  const orgId = c.get("orgId") as string;
  const rows = await db
    .select()
    .from(recalls)
    .where(eq(recalls.organizationId, orgId))
    .orderBy(desc(recalls.createdAt));
  return c.json(rows);
});

distributionRouter.get("/recalls/:id", async (c) => {
  const orgId = c.get("orgId") as string;
  const [row] = await db
    .select()
    .from(recalls)
    .where(and(eq(recalls.id, c.req.param("id")), eq(recalls.organizationId, orgId)));
  if (!row) return c.json({ error: "Not found" }, 404);
  return c.json(row);
});

distributionRouter.post("/recalls", async (c) => {
  const orgId = c.get("orgId") as string;
  const parsed = recallSchema.safeParse(await c.req.json().catch(() => ({})));
  if (!parsed.success) return c.json({ error: parsed.error.flatten() }, 400);
  const id = parsed.data.id ?? `RC-${Date.now()}`;
  const [row] = await db
    .insert(recalls)
    .values({ ...parsed.data, id, organizationId: orgId })
    .returning();
  await audit("create", "recalls", id, c.get("userId" as never));
  return c.json(row, 201);
});

distributionRouter.patch("/recalls/:id", async (c) => {
  const orgId = c.get("orgId") as string;
  const id = c.req.param("id");
  const parsed = recallSchema.partial().safeParse(await c.req.json().catch(() => ({})));
  if (!parsed.success) return c.json({ error: parsed.error.flatten() }, 400);
  const { id: _omit, ...patch } = parsed.data;
  const [row] = await db
    .update(recalls)
    .set(patch)
    .where(and(eq(recalls.id, id), eq(recalls.organizationId, orgId)))
    .returning();
  if (!row) return c.json({ error: "Not found" }, 404);
  await audit("update", "recalls", id, c.get("userId" as never));
  return c.json(row);
});

// ── waste-records ──────────────────────────────────────────────────────────-
distributionRouter.get("/waste-records", async (c) => {
  const orgId = c.get("orgId") as string;
  const rows = await db
    .select()
    .from(wasteRecords)
    .where(eq(wasteRecords.organizationId, orgId))
    .orderBy(desc(wasteRecords.createdAt));
  return c.json(rows.map(stripQtyNum));
});

distributionRouter.get("/waste-records/:id", async (c) => {
  const orgId = c.get("orgId") as string;
  const [row] = await db
    .select()
    .from(wasteRecords)
    .where(and(eq(wasteRecords.id, c.req.param("id")), eq(wasteRecords.organizationId, orgId)));
  if (!row) return c.json({ error: "Not found" }, 404);
  return c.json(stripQtyNum(row));
});

distributionRouter.post("/waste-records", async (c) => {
  const orgId = c.get("orgId") as string;
  const parsed = wasteRecordSchema.safeParse(await c.req.json().catch(() => ({})));
  if (!parsed.success) return c.json({ error: parsed.error.flatten() }, 400);
  const id = parsed.data.id ?? `WST-${Date.now()}`;
  const [row] = await db
    .insert(wasteRecords)
    .values({ ...parsed.data, id, organizationId: orgId })
    .returning();
  await audit("create", "waste_records", id, c.get("userId" as never));
  return c.json(stripQtyNum(row), 201);
});

distributionRouter.patch("/waste-records/:id", async (c) => {
  const orgId = c.get("orgId") as string;
  const id = c.req.param("id");
  const parsed = wasteRecordSchema.partial().safeParse(await c.req.json().catch(() => ({})));
  if (!parsed.success) return c.json({ error: parsed.error.flatten() }, 400);
  const { id: _omit, ...patch } = parsed.data;
  const [row] = await db
    .update(wasteRecords)
    .set(patch)
    .where(and(eq(wasteRecords.id, id), eq(wasteRecords.organizationId, orgId)))
    .returning();
  if (!row) return c.json({ error: "Not found" }, 404);
  await audit("update", "waste_records", id, c.get("userId" as never));
  return c.json(stripQtyNum(row));
});

// ── returns ────────────────────────────────────────────────────────────────-
distributionRouter.get("/returns", async (c) => {
  const orgId = c.get("orgId") as string;
  const rows = await db
    .select()
    .from(returns)
    .where(eq(returns.organizationId, orgId))
    .orderBy(desc(returns.createdAt));
  return c.json(rows);
});

distributionRouter.get("/returns/:id", async (c) => {
  const orgId = c.get("orgId") as string;
  const [row] = await db
    .select()
    .from(returns)
    .where(and(eq(returns.id, c.req.param("id")), eq(returns.organizationId, orgId)));
  if (!row) return c.json({ error: "Not found" }, 404);
  return c.json(row);
});

distributionRouter.post("/returns", async (c) => {
  const orgId = c.get("orgId") as string;
  const parsed = returnSchema.safeParse(await c.req.json().catch(() => ({})));
  if (!parsed.success) return c.json({ error: parsed.error.flatten() }, 400);
  const id = parsed.data.id ?? `RET-${Date.now()}`;
  const [row] = await db
    .insert(returns)
    .values({ ...parsed.data, id, organizationId: orgId })
    .returning();
  await audit("create", "returns", id, c.get("userId" as never));
  return c.json(row, 201);
});

distributionRouter.patch("/returns/:id", async (c) => {
  const orgId = c.get("orgId") as string;
  const id = c.req.param("id");
  const parsed = returnSchema.partial().safeParse(await c.req.json().catch(() => ({})));
  if (!parsed.success) return c.json({ error: parsed.error.flatten() }, 400);
  const { id: _omit, ...patch } = parsed.data;
  const [row] = await db
    .update(returns)
    .set(patch)
    .where(and(eq(returns.id, id), eq(returns.organizationId, orgId)))
    .returning();
  if (!row) return c.json({ error: "Not found" }, 404);
  await audit("update", "returns", id, c.get("userId" as never));
  return c.json(row);
});
