import { auth } from "./auth";
import { pool } from "./db";
import { env } from "./env";

/**
 * Idempotently create the bootstrap administrator on first boot. Controlled
 * by SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD — no-op when unset or when the
 * user already exists.
 */
export async function seedAdmin(): Promise<void> {
  if (!env.seedAdminEmail || !env.seedAdminPassword) return;
  try {
    const existing = await pool.query(`SELECT id FROM "user" WHERE email = $1 LIMIT 1`, [
      env.seedAdminEmail,
    ]);
    if (existing.rowCount && existing.rowCount > 0) {
      // Ensure the role is administrator even if the row predates seeding.
      await pool.query(`UPDATE "user" SET role = 'administrator' WHERE email = $1`, [
        env.seedAdminEmail,
      ]);
      return;
    }
    await auth.api.createUser({
      body: {
        email: env.seedAdminEmail,
        password: env.seedAdminPassword,
        name: env.seedAdminName,
        role: "administrator",
      },
    });
    console.log(`✅ Seeded bootstrap admin: ${env.seedAdminEmail}`);
  } catch (err) {
    console.error("[seed-admin] failed:", (err as Error)?.message);
  }
}
