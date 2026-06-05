import { Hono } from "hono";
import { desc, eq } from "drizzle-orm";
import { db, productionBatches } from "../schema";
import { pool } from "../../db";
import { auth } from "../../auth";

/**
 * Dashboard aggregation routes. Read-only; requires an authenticated session.
 * KPIs and chart series are computed from the domain tables via the shared pool.
 */
export const dashboardRouter = new Hono();

// ── Session guard: 401 if there is no active session ───────────────────────--
dashboardRouter.use("*", async (c, next) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  if (!session) return c.json({ error: "Unauthorized" }, 401);
  return next();
});

// Parse the leading number out of a text quantity ("4,800 L" -> 4800).
function leadingNum(v: unknown): number {
  if (v == null) return 0;
  const m = String(v).replace(/,/g, "").match(/-?\d+(\.\d+)?/);
  return m ? Number(m[0]) : 0;
}

// Days until a date string; null if unparseable.
function daysUntil(v: unknown, now: number): number | null {
  if (v == null) return null;
  const t = Date.parse(String(v));
  if (Number.isNaN(t)) return null;
  return Math.floor((t - now) / 86_400_000);
}

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

dashboardRouter.get("/dashboard", async (c) => {
  const orgId = c.get("orgId") as string;
  const now = Date.now();

  // ── KPIs (real counts; guard against nulls) ──────────────────────────────
  const [
    activeBatches,
    fgAwaitingQc,
    openRecalls,
    qcFailures,
    rawLotsToday,
    dispatchedThisWeek,
    supplierRejectionRate,
    expiringStock,
  ] = await Promise.all([
    pool
      .query(`SELECT count(*)::int AS n FROM production_batches WHERE status ILIKE 'In Process' AND organization_id = $1`, [orgId])
      .then((r) => r.rows[0]?.n ?? 0),
    pool
      .query(`SELECT count(*)::int AS n FROM finished_goods WHERE status ILIKE 'Pending QC' AND organization_id = $1`, [orgId])
      .then((r) => r.rows[0]?.n ?? 0),
    pool
      .query(`SELECT count(*)::int AS n FROM recalls WHERE status ILIKE 'Open' AND organization_id = $1`, [orgId])
      .then((r) => r.rows[0]?.n ?? 0),
    pool
      .query(`SELECT count(*)::int AS n FROM qc_checks WHERE status ILIKE 'Fail' AND organization_id = $1`, [orgId])
      .then((r) => r.rows[0]?.n ?? 0),
    pool
      .query(`SELECT count(*)::int AS n FROM raw_materials WHERE organization_id = $1`, [orgId])
      .then((r) => r.rows[0]?.n ?? 0),
    pool
      .query(`SELECT COALESCE(sum(qty_num), 0)::float AS n FROM dispatches WHERE organization_id = $1`, [orgId])
      .then((r) => r.rows[0]?.n ?? 0),
    pool
      .query(`SELECT rejection FROM suppliers WHERE organization_id = $1`, [orgId])
      .then((r) => {
        const vals = r.rows.map((row) => leadingNum(row.rejection)).filter((n) => !Number.isNaN(n));
        if (!vals.length) return 0;
        return Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10;
      }),
    pool
      .query(`SELECT expiry, status FROM finished_goods WHERE organization_id = $1`, [orgId])
      .then((r) =>
        r.rows.filter((row) => {
          const d = daysUntil(row.expiry, now);
          if (d == null) return /expir/i.test(String(row.status ?? ""));
          return d < 30;
        }).length,
      ),
  ]);

  // ── productionByProduct: sum(yield_num) grouped by product ────────────────
  const productionByProduct = await pool
    .query(
      `SELECT product, COALESCE(sum(yield_num), 0)::float AS volume
         FROM production_batches
        WHERE product IS NOT NULL AND organization_id = $1
        GROUP BY product
        ORDER BY volume DESC`,
      [orgId],
    )
    .then((r) => r.rows.map((row) => ({ product: row.product, volume: row.volume ?? 0 })));

  // ── qcTrend: best-effort single bucket of pass/fail counts ────────────────
  const qcTrend = await pool
    .query(
      `SELECT
         count(*) FILTER (WHERE status ILIKE 'Pass')::int AS pass,
         count(*) FILTER (WHERE status ILIKE 'Fail')::int AS fail
       FROM qc_checks
       WHERE organization_id = $1`,
      [orgId],
    )
    .then((r) => [{ day: "All", pass: r.rows[0]?.pass ?? 0, fail: r.rows[0]?.fail ?? 0 }]);

  // ── expiryRisk: bucket finished_goods by expiry vs now ────────────────────
  const expiryRisk = await pool.query(`SELECT expiry, status FROM finished_goods WHERE organization_id = $1`, [orgId]).then((r) => {
    let critical = 0;
    let warning = 0;
    let safe = 0;
    for (const row of r.rows) {
      const d = daysUntil(row.expiry, now);
      if (d == null) {
        // approximate by status when dates are unparseable
        if (/expir/i.test(String(row.status ?? ""))) critical++;
        else safe++;
        continue;
      }
      if (d < 7) critical++;
      else if (d < 30) warning++;
      else safe++;
    }
    return [
      { name: "Critical (<7d)", value: critical },
      { name: "Warning (<30d)", value: warning },
      { name: "Safe", value: safe },
    ];
  });

  // ── dispatchByCustomer: sum(qty_num) grouped by customer ──────────────────
  const dispatchByCustomer = await pool
    .query(
      `SELECT customer, COALESCE(sum(qty_num), 0)::float AS volume
         FROM dispatches
        WHERE customer IS NOT NULL AND organization_id = $1
        GROUP BY customer
        ORDER BY volume DESC`,
      [orgId],
    )
    .then((r) => r.rows.map((row) => ({ customer: row.customer, volume: row.volume ?? 0 })));

  // ── wasteByReason: sum(qty_num) grouped by reason ─────────────────────────
  const wasteByReason = await pool
    .query(
      `SELECT reason, COALESCE(sum(qty_num), 0)::float AS value
         FROM waste_records
        WHERE reason IS NOT NULL AND organization_id = $1
        GROUP BY reason
        ORDER BY value DESC`,
      [orgId],
    )
    .then((r) => r.rows.map((row) => ({ reason: row.reason, value: row.value ?? 0 })));

  // ── recentBatches: latest 4 production_batches in the mock shape ──────────
  const recentBatches = await db
    .select()
    .from(productionBatches)
    .where(eq(productionBatches.organizationId, orgId))
    .orderBy(desc(productionBatches.createdAt))
    .limit(4)
    .then((rows) => rows.map(batchOut));

  return c.json({
    kpis: {
      activeBatches,
      rawLotsToday,
      fgAwaitingQc,
      expiringStock,
      openRecalls,
      qcFailures,
      dispatchedThisWeek,
      supplierRejectionRate,
    },
    productionByProduct,
    qcTrend,
    expiryRisk,
    dispatchByCustomer,
    wasteByReason,
    recentBatches,
  });
});
