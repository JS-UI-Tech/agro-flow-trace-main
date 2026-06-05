import type { Context, Next } from "hono";
import { pool } from "../db";
import { auth } from "../auth";

/**
 * Multi-tenant scoping. Every authenticated user belongs to exactly one
 * organization (their tenant). Domain data is isolated per organization via
 * the `organization_id` column. If a user has no membership yet (e.g. a brand
 * new sign-up), a personal organization is created on first use — so new
 * accounts start with an empty, isolated workspace rather than shared data.
 *
 * better-auth's organization tables use quoted camelCase columns:
 *   organization(id, name, slug, logo, "createdAt", metadata)
 *   member(id, "organizationId", "userId", role, "createdAt")
 */

function slugify(input: string): string {
  return (
    input
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "org"
  );
}

export async function resolveOrgId(session: {
  user: { id: string; name?: string | null; email: string };
}): Promise<string> {
  const userId = session.user.id;

  // 1. Existing membership (oldest = primary org).
  const existing = await pool.query(
    `SELECT "organizationId" AS org FROM member WHERE "userId" = $1 ORDER BY "createdAt" ASC LIMIT 1`,
    [userId],
  );
  if (existing.rowCount && existing.rows[0].org) return existing.rows[0].org as string;

  // 2. None yet — create a personal organization and make the user its owner.
  const orgId = Bun.randomUUIDv7();
  const memberId = Bun.randomUUIDv7();
  const baseName = session.user.name?.trim() || session.user.email.split("@")[0] || "My Org";
  const slug = `${slugify(baseName)}-${orgId.slice(0, 6)}`;
  await pool.query(
    `INSERT INTO organization (id, name, slug, "createdAt") VALUES ($1, $2, $3, NOW())
     ON CONFLICT (id) DO NOTHING`,
    [orgId, baseName, slug],
  );
  await pool.query(
    `INSERT INTO member (id, "organizationId", "userId", role, "createdAt") VALUES ($1, $2, $3, 'owner', NOW())`,
    [memberId, orgId, userId],
  );
  return orgId;
}

/**
 * Hono middleware: require a session and attach the resolved org id + user id
 * to the context. Returns 401 when unauthenticated.
 */
export async function requireOrg(c: Context, next: Next) {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  if (!session?.user) return c.json({ error: "Unauthorized" }, 401);
  const orgId = await resolveOrgId(session as { user: { id: string; name?: string | null; email: string } });
  c.set("orgId", orgId);
  c.set("userId", session.user.id);
  return next();
}
