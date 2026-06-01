import { betterAuth } from "better-auth";
import { admin, twoFactor, emailOTP, openAPI } from "better-auth/plugins";
import pg from "pg";
import { env } from "./env";
import { secondaryStorage } from "./redis";
import { sendEmail } from "./email";
import { ac, roles, ROLE_NAMES } from "./permissions";

/**
 * Dedicated pool for better-auth (kysely under the hood). Kept separate from
 * the app query pool so auth traffic and domain traffic don't contend.
 */
const url = new URL(env.databaseUrl);
const sslMode = url.searchParams.get("sslmode");
url.searchParams.delete("sslrootcert");

const authPool = new pg.Pool({
  connectionString: url.toString(),
  ssl: sslMode === "require" || sslMode === "verify-full" ? { rejectUnauthorized: false } : undefined,
  keepAlive: true,
  keepAliveInitialDelayMillis: 10_000,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 10_000,
});
authPool.on("error", () => {});

export const auth = betterAuth({
  appName: "AgroTrace",
  baseURL: env.authUrl,
  secret: env.authSecret,
  database: authPool,
  ...(secondaryStorage ? { secondaryStorage } : {}),

  trustedOrigins: env.trustedOrigins,

  emailAndPassword: {
    enabled: true,
    // Verification is available (emailOTP) but not blocking, so the system
    // is usable immediately; flip to true once an email provider is wired.
    requireEmailVerification: false,
    minPasswordLength: 8,
    sendResetPassword: async ({ user, url: resetUrl }) => {
      await sendEmail({
        to: user.email,
        subject: "Reset your AgroTrace password",
        text: `Reset your password using this link:\n${resetUrl}\n\nIf you did not request this, ignore this email.`,
      });
    },
  },

  emailVerification: {
    sendVerificationEmail: async ({ user, url: verifyUrl }) => {
      await sendEmail({
        to: user.email,
        subject: "Verify your AgroTrace email",
        text: `Confirm your email address:\n${verifyUrl}`,
      });
    },
  },

  session: {
    expiresIn: 60 * 60 * 8, // 8h
    updateAge: 60 * 60, // refresh every hour
    cookieCache: { enabled: true, maxAge: 5 * 60 },
  },

  advanced: {
    database: { generateId: () => Bun.randomUUIDv7() },
    // Frontend (Cloudflare) and API (aerocruz) are different sites, so the
    // session cookie must be cross-site-capable in production.
    defaultCookieAttributes: env.isProd
      ? { sameSite: "none", secure: true, httpOnly: true }
      : { sameSite: "lax", secure: false, httpOnly: true },
  },

  plugins: [
    admin({
      ac,
      roles,
      adminRoles: ["administrator"],
      defaultRole: "floor_operator",
    }),
    twoFactor({
      issuer: "AgroTrace",
      otpOptions: {
        async sendOTP({ user, otp }) {
          await sendEmail({
            to: user.email,
            subject: "Your AgroTrace 2FA code",
            text: `Your two-factor authentication code is: ${otp}`,
          });
        },
      },
    }),
    emailOTP({
      otpLength: 6,
      expiresIn: 10 * 60,
      async sendVerificationOTP({ email, otp, type }) {
        const label =
          type === "sign-in" ? "sign-in" : type === "email-verification" ? "email verification" : "password reset";
        await sendEmail({
          to: email,
          subject: `Your AgroTrace ${label} code`,
          text: `Your ${label} code is: ${otp}\nIt expires in 10 minutes.`,
        });
      },
    }),
    openAPI(), // interactive docs at /api/auth/reference
  ],
});

export type Auth = typeof auth;
export type Session = typeof auth.$Infer.Session;
export { ROLE_NAMES };
