import { createFileRoute, Link, useRouter, useSearch } from "@tanstack/react-router";
import { useState } from "react";
import { signIn, emailOtp } from "@/lib/auth-client";
import { AuthShell, fieldClass, labelClass, primaryBtn, errorClass } from "@/components/AuthShell";

export const Route = createFileRoute("/login")({
  validateSearch: (s: Record<string, unknown>) => ({ redirect: (s.redirect as string) || "/" }),
  component: LoginPage,
});

function LoginPage() {
  const router = useRouter();
  const { redirect } = useSearch({ from: "/login" });
  const [mode, setMode] = useState<"password" | "otp">("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function passwordLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const { error } = await signIn.email({ email, password });
    setLoading(false);
    if (error) return setError(error.message || "Sign-in failed");
    router.navigate({ to: redirect });
  }

  async function sendOtp() {
    setError("");
    setLoading(true);
    const { error } = await emailOtp.sendVerificationOtp({ email, type: "sign-in" });
    setLoading(false);
    if (error) return setError(error.message || "Could not send code");
    setOtpSent(true);
  }

  async function otpLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const { error } = await signIn.emailOtp({ email, otp });
    setLoading(false);
    if (error) return setError(error.message || "Invalid code");
    router.navigate({ to: redirect });
  }

  return (
    <AuthShell
      title="Sign in"
      subtitle="Access your AgroTrace workspace"
      footer={
        <>
          New to AgroTrace?{" "}
          <Link to="/signup" className="font-medium text-primary hover:underline">
            Create an account
          </Link>
        </>
      }
    >
      {error && <div className={`${errorClass} mb-4`}>{error}</div>}

      {mode === "password" ? (
        <form onSubmit={passwordLogin} className="space-y-4">
          <div>
            <label className={labelClass}>Email</label>
            <input className={fieldClass} type="email" value={email} required
              onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
          </div>
          <div>
            <div className="flex items-center justify-between">
              <label className={labelClass}>Password</label>
              <Link to="/forgot-password" className="mb-1.5 text-xs text-primary hover:underline">
                Forgot?
              </Link>
            </div>
            <input className={fieldClass} type="password" value={password} required
              onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
          </div>
          <button className={primaryBtn} disabled={loading}>
            {loading ? "Signing in…" : "Sign in"}
          </button>
          <button type="button" onClick={() => setMode("otp")}
            className="w-full text-center text-sm text-primary hover:underline">
            Sign in with an email code instead
          </button>
        </form>
      ) : (
        <form onSubmit={otpLogin} className="space-y-4">
          <div>
            <label className={labelClass}>Email</label>
            <input className={fieldClass} type="email" value={email} required
              onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
          </div>
          {otpSent && (
            <div>
              <label className={labelClass}>6-digit code</label>
              <input className={fieldClass} inputMode="numeric" value={otp}
                onChange={(e) => setOtp(e.target.value)} placeholder="123456" />
            </div>
          )}
          {!otpSent ? (
            <button type="button" className={primaryBtn} disabled={loading || !email} onClick={sendOtp}>
              {loading ? "Sending…" : "Send code"}
            </button>
          ) : (
            <button className={primaryBtn} disabled={loading || otp.length < 6}>
              {loading ? "Verifying…" : "Verify & sign in"}
            </button>
          )}
          <button type="button" onClick={() => setMode("password")}
            className="w-full text-center text-sm text-primary hover:underline">
            Use password instead
          </button>
        </form>
      )}
    </AuthShell>
  );
}
