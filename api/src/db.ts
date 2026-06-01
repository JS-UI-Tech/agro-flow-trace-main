import pg from "pg";
import { env } from "./env";

/**
 * Long-running pg.Pool tuned for a persistent server (keepAlive defeats
 * NAT/firewall idle drops; conservative idle timeout retires sockets before
 * the server kills them). Mirrors the hardened config proven in production.
 */
const url = new URL(env.databaseUrl);
const sslMode = url.searchParams.get("sslmode");
url.searchParams.delete("sslrootcert");

const globalForDb = globalThis as typeof globalThis & { agrotracePgPool?: pg.Pool };

export const pool =
  globalForDb.agrotracePgPool ??
  new pg.Pool({
    connectionString: url.toString(),
    ssl: sslMode === "require" || sslMode === "verify-full" ? { rejectUnauthorized: false } : undefined,
    keepAlive: true,
    keepAliveInitialDelayMillis: 10_000,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
  });

if (!globalForDb.agrotracePgPool) {
  pool.on("error", (err) => {
    if (process.env.DEBUG_DB_POOL === "true") {
      console.warn("[db] background socket error (auto-recovered):", err?.message);
    }
  });
  globalForDb.agrotracePgPool = pool;
}

export async function dbHealthCheck(): Promise<boolean> {
  try {
    await pool.query("SELECT 1");
    return true;
  } catch (err) {
    console.error("[db] health check failed:", (err as Error)?.message);
    return false;
  }
}
