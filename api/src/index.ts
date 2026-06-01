import { Hono } from "hono";
import { cors } from "hono/cors";
import { auth } from "./auth";
import { env } from "./env";
import { dbHealthCheck } from "./db";
import { redisHealthCheck } from "./redis";
import { seedAdmin } from "./seed-admin";

const app = new Hono();

// ── CORS (credentialed) for the configured frontend origins ────────────────
app.use(
  "*",
  cors({
    origin: (origin) => {
      if (!origin) return env.trustedOrigins[0] ?? "";
      return env.trustedOrigins.includes(origin) ? origin : "";
    },
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    credentials: true,
  }),
);

// ── Health ─────────────────────────────────────────────────────────────────
app.get("/", (c) => c.json({ service: "agrotrace-api", status: "ok" }));
app.get("/healthz", (c) => c.json({ status: "ok" }));
app.get("/readyz", async (c) => {
  const [db, redis] = await Promise.all([dbHealthCheck(), redisHealthCheck()]);
  const ok = db; // Redis is optional
  return c.json({ status: ok ? "ok" : "degraded", db: db ? "ok" : "down", redis }, ok ? 200 : 503);
});

// ── better-auth: every auth endpoint + interactive docs at /api/auth/reference
app.on(["GET", "POST"], "/api/auth/*", (c) => auth.handler(c.req.raw));

// ── Current session helper ───────────────────────────────────────────────--
app.get("/api/me", async (c) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  if (!session) return c.json({ user: null }, 401);
  return c.json(session);
});

// ── Boot ─────────────────────────────────────────────────────────────────--
if (await dbHealthCheck()) {
  console.log("✅ DB connected");
} else {
  console.error("❌ DB connection failed — check DATABASE_URL");
}
await seedAdmin();

const server = Bun.serve({
  port: env.port,
  fetch: app.fetch,
  idleTimeout: 30,
});

console.log(`🚀 AgroTrace API listening on :${server.port} (${env.nodeEnv})`);
console.log(`   trusted origins: ${env.trustedOrigins.join(", ") || "(none set)"}`);
