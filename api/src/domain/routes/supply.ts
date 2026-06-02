import { Hono } from "hono";
import { z } from "zod";
import { eq, desc } from "drizzle-orm";
import { db, suppliers, rawMaterials } from "../schema";
import { auth } from "../../auth";
import { pool } from "../../db";

/**
 * Supply domain routes: suppliers + raw materials.
 * Every route requires an authenticated session.
 */
export const supplyRouter = new Hono();

// ── session guard ──────────────────────────────────────────────────────────
supplyRouter.use("*", async (c, next) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  if (!session) return c.json({ error: "Unauthorized" }, 401);
  c.set("userId", session.user?.id ?? null);
  await next();
});

// ── best-effort audit (never fails the request) ────────────────────────────
async function audit(action: string, entityType: string, entityId: string, userId: unknown) {
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

// ── suppliers ──────────────────────────────────────────────────────────────
const supplierSchema = z
  .object({
    id: z.string().optional(),
    name: z.string().optional(),
    location: z.string().optional(),
    materials: z.string().optional(),
    status: z.string().optional(),
    risk: z.string().optional(),
    cert: z.string().optional(),
    rejection: z.string().optional(),
  })
  .strip();

supplyRouter.get("/suppliers", async (c) => {
  const rows = await db.select().from(suppliers).orderBy(desc(suppliers.createdAt));
  return c.json(rows.map(toSupplier));
});

supplyRouter.get("/suppliers/:id", async (c) => {
  const [row] = await db.select().from(suppliers).where(eq(suppliers.id, c.req.param("id"))).limit(1);
  if (!row) return c.json({ error: "Not found" }, 404);
  return c.json(toSupplier(row));
});

supplyRouter.post("/suppliers", async (c) => {
  const parsed = supplierSchema.safeParse(await c.req.json().catch(() => ({})));
  if (!parsed.success) return c.json({ error: "Invalid body", details: parsed.error.flatten() }, 400);
  const id = parsed.data.id ?? `SUP-${Date.now()}`;
  const [row] = await db.insert(suppliers).values({ ...parsed.data, id }).returning();
  await audit("create", "suppliers", id, c.get("userId"));
  return c.json(toSupplier(row), 201);
});

supplyRouter.patch("/suppliers/:id", async (c) => {
  const parsed = supplierSchema.safeParse(await c.req.json().catch(() => ({})));
  if (!parsed.success) return c.json({ error: "Invalid body", details: parsed.error.flatten() }, 400);
  const id = c.req.param("id");
  const { id: _ignore, ...values } = parsed.data;
  const [row] = await db.update(suppliers).set(values).where(eq(suppliers.id, id)).returning();
  if (!row) return c.json({ error: "Not found" }, 404);
  await audit("update", "suppliers", id, c.get("userId"));
  return c.json(toSupplier(row));
});

function toSupplier(r: typeof suppliers.$inferSelect) {
  return {
    id: r.id,
    name: r.name,
    location: r.location,
    materials: r.materials,
    status: r.status,
    risk: r.risk,
    cert: r.cert,
    rejection: r.rejection,
  };
}

// ── raw materials ──────────────────────────────────────────────────────────
const rawMaterialSchema = z
  .object({
    id: z.string().optional(),
    material: z.string().optional(),
    supplier: z.string().optional(),
    lot: z.string().optional(),
    qty: z.string().optional(),
    received: z.string().optional(),
    expiry: z.string().optional(),
    status: z.string().optional(),
    location: z.string().optional(),
  })
  .strip();

supplyRouter.get("/raw-materials", async (c) => {
  const rows = await db.select().from(rawMaterials).orderBy(desc(rawMaterials.createdAt));
  return c.json(rows.map(toRawMaterial));
});

supplyRouter.get("/raw-materials/:id", async (c) => {
  const [row] = await db.select().from(rawMaterials).where(eq(rawMaterials.id, c.req.param("id"))).limit(1);
  if (!row) return c.json({ error: "Not found" }, 404);
  return c.json(toRawMaterial(row));
});

supplyRouter.post("/raw-materials", async (c) => {
  const parsed = rawMaterialSchema.safeParse(await c.req.json().catch(() => ({})));
  if (!parsed.success) return c.json({ error: "Invalid body", details: parsed.error.flatten() }, 400);
  const id = parsed.data.id ?? `RM-${Date.now()}`;
  const [row] = await db.insert(rawMaterials).values({ ...parsed.data, id }).returning();
  await audit("create", "raw_materials", id, c.get("userId"));
  return c.json(toRawMaterial(row), 201);
});

supplyRouter.patch("/raw-materials/:id", async (c) => {
  const parsed = rawMaterialSchema.safeParse(await c.req.json().catch(() => ({})));
  if (!parsed.success) return c.json({ error: "Invalid body", details: parsed.error.flatten() }, 400);
  const id = c.req.param("id");
  const { id: _ignore, ...values } = parsed.data;
  const [row] = await db.update(rawMaterials).set(values).where(eq(rawMaterials.id, id)).returning();
  if (!row) return c.json({ error: "Not found" }, 404);
  await audit("update", "raw_materials", id, c.get("userId"));
  return c.json(toRawMaterial(row));
});

function toRawMaterial(r: typeof rawMaterials.$inferSelect) {
  return {
    id: r.id,
    material: r.material,
    supplier: r.supplier,
    lot: r.lot,
    qty: r.qty,
    received: r.received,
    expiry: r.expiry,
    status: r.status,
    location: r.location,
  };
}
