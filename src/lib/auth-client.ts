import { createAuthClient } from "better-auth/react";
import { adminClient, twoFactorClient, emailOTPClient } from "better-auth/client/plugins";

/**
 * Base URL of the AgroTrace API (the Bun + better-auth backend on Coolify).
 * Injected at build time via VITE_API_URL; falls back to the production API.
 */
const API_URL =
  (import.meta as unknown as { env?: Record<string, string> }).env?.VITE_API_URL ||
  "https://api.agro-trace.jsui.digital";

export const authClient = createAuthClient({
  baseURL: API_URL,
  basePath: "/api/auth",
  fetchOptions: {
    credentials: "include",
  },
  plugins: [
    adminClient(),
    twoFactorClient({
      onTwoFactorRedirect() {
        if (typeof window !== "undefined") window.location.href = "/two-factor";
      },
    }),
    emailOTPClient(),
  ],
});

export const {
  signIn,
  signUp,
  signOut,
  useSession,
  forgetPassword,
  resetPassword,
  sendVerificationEmail,
  changePassword,
  updateUser,
  twoFactor,
  emailOtp,
  admin,
} = authClient;

export type SessionUser = NonNullable<ReturnType<typeof useSession>["data"]>["user"];
