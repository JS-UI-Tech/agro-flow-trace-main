import { Hono } from "hono";
import { requireOrg } from "./org";
import { dashboardRouter } from "./routes/dashboard";
import { supplyRouter } from "./routes/supply";
import { productionRouter } from "./routes/production";
import { distributionRouter } from "./routes/distribution";
import { extendedRouter } from "./routes/extended";

export { migrateDomain } from "./migrate";
export { seedDomain } from "./seed";
export { bootstrapJsuiOrg } from "./bootstrap";

/**
 * Aggregate domain router. Mount on the app under "/api".
 * Final paths e.g. /api/dashboard, /api/suppliers, /api/production-batches.
 *
 * requireOrg runs first for every domain request: it enforces auth and
 * resolves the caller's organization id into c.get("orgId"), so all routes
 * below are tenant-scoped.
 */
export const domainRouter = new Hono();

domainRouter.use("*", requireOrg);

domainRouter.route("/", dashboardRouter);
domainRouter.route("/", supplyRouter);
domainRouter.route("/", productionRouter);
domainRouter.route("/", distributionRouter);
domainRouter.route("/", extendedRouter);
