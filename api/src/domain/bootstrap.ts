import { pool } from "../db";
import { env } from "../env";

/**
 * One-time, idempotent tenancy bootstrap:
 *  - ensure the demo organization "jsui" exists
 *  - assign any unscoped domain rows (organization_id IS NULL — i.e. the
 *    original seed data) to the jsui org
 *  - make the bootstrap admin a member (owner) of jsui so they can see it
 *
 * Safe to run on every boot.
 */
const DOMAIN_TABLES = [
  "suppliers", "raw_materials", "production_batches", "finished_goods",
  "dispatches", "recalls", "qc_checks", "waste_records", "returns",
  "recipes", "production_orders", "packaging_runs", "workflow_templates",
  "workflow_instances", "company_config",
];

export async function bootstrapJsuiOrg(): Promise<void> {
  try {
    // 1. Ensure the jsui org exists (slug is unique-ish; look up first).
    const found = await pool.query(`SELECT id FROM organization WHERE slug = 'jsui' LIMIT 1`);
    let orgId: string;
    if (found.rowCount && found.rows[0].id) {
      orgId = found.rows[0].id as string;
    } else {
      orgId = Bun.randomUUIDv7();
      await pool.query(
        `INSERT INTO organization (id, name, slug, "createdAt") VALUES ($1, 'JSUI', 'jsui', NOW())`,
        [orgId],
      );
      console.log(`✅ Created demo org "jsui" (${orgId})`);
    }

    // 2. Adopt all unscoped (legacy seed) rows into jsui.
    let adopted = 0;
    for (const t of DOMAIN_TABLES) {
      const r = await pool.query(
        `UPDATE ${t} SET organization_id = $1 WHERE organization_id IS NULL`,
        [orgId],
      );
      adopted += r.rowCount ?? 0;
    }
    if (adopted > 0) console.log(`✅ Adopted ${adopted} legacy rows into jsui`);

    // 3. Ensure the bootstrap admin is an owner of jsui.
    if (env.seedAdminEmail) {
      const u = await pool.query(`SELECT id FROM "user" WHERE email = $1 LIMIT 1`, [env.seedAdminEmail]);
      if (u.rowCount && u.rows[0].id) {
        const userId = u.rows[0].id as string;
        const m = await pool.query(
          `SELECT id FROM member WHERE "organizationId" = $1 AND "userId" = $2 LIMIT 1`,
          [orgId, userId],
        );
        if (!m.rowCount) {
          await pool.query(
            `INSERT INTO member (id, "organizationId", "userId", role, "createdAt") VALUES ($1, $2, $3, 'owner', NOW())`,
            [Bun.randomUUIDv7(), orgId, userId],
          );
          console.log(`✅ Added ${env.seedAdminEmail} to jsui as owner`);
        }
      }
    }
  } catch (err) {
    console.error("[bootstrap] jsui org bootstrap failed:", (err as Error)?.message);
  }
}
