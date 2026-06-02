import { Hono } from "hono";
import { dashboardRouter } from "./routes/dashboard";
import { supplyRouter } from "./routes/supply";
import { productionRouter } from "./routes/production";
import { distributionRouter } from "./routes/distribution";
import { extendedRouter } from "./routes/extended";

export { migrateDomain } from "./migrate";
export { seedDomain } from "./seed";

/**
 * Aggregate domain router. Mount on the app under "/api".
 * Final paths e.g. /api/dashboard, /api/suppliers, /api/production-batches.
 */
export const domainRouter = new Hono();

domainRouter.route("/", dashboardRouter);
domainRouter.route("/", supplyRouter);
domainRouter.route("/", productionRouter);
domainRouter.route("/", distributionRouter);
domainRouter.route("/", extendedRouter);
