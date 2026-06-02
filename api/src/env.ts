/**
 * Centralised, validated environment access for the AgroTrace API.
 * Fails loudly at boot when a required variable is missing.
 */

function required(name: string): string {
  const value = process.env[name];
  if (!value || value.trim() === "") {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function optional(name: string, fallback = ""): string {
  return process.env[name]?.trim() || fallback;
}

export const env = {
  nodeEnv: optional("NODE_ENV", "development"),
  isProd: optional("NODE_ENV", "development") === "production",
  port: Number(optional("PORT", "3000")),

  databaseUrl: required("DATABASE_URL"),
  redisUrl: optional("REDIS_URL"),

  authSecret: required("BETTER_AUTH_SECRET"),
  // Public URL the API is served from (used by better-auth for links/cookies).
  authUrl: optional("BETTER_AUTH_URL", `http://localhost:${optional("PORT", "3000")}`),

  // Comma-separated list of allowed browser origins (the frontend).
  trustedOrigins: optional("TRUSTED_ORIGINS")
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean),

  // When the frontend and API share a parent domain (e.g. agro-trace.jsui.digital
  // and api.agro-trace.jsui.digital), set this to ".agro-trace.jsui.digital" so the
  // session cookie is shared across subdomains (same-site, no third-party cookies).
  cookieDomain: optional("AUTH_COOKIE_DOMAIN"),

  // Optional transactional email (Resend). When absent, emails are logged.
  resendApiKey: optional("RESEND_API_KEY"),
  emailFrom: optional("EMAIL_FROM", "AgroTrace <noreply@agro-trace.jsui.digital>"),

  // Bootstrap admin (seeded on first boot if it does not exist).
  seedAdminEmail: optional("SEED_ADMIN_EMAIL"),
  seedAdminPassword: optional("SEED_ADMIN_PASSWORD"),
  seedAdminName: optional("SEED_ADMIN_NAME", "AgroTrace Admin"),
};
