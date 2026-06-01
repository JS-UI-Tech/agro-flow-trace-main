import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { emailOtp } from "@/lib/auth-client";
import { AuthShell, fieldClass, labelClass, primaryBtn, errorClass, okClass } from "@/components/AuthShell";

export const Route = createFileRoute("/verify-email")({
  validateSearch: (s: Record<string, unknown>) => ({ email: (s.email as string) || "" }),
  component: VerifyEmailPage,
});

function VerifyEmailPage() {
  const router = useRouter();
  const search = Route.useSearch();
  const [email, setEmail] = useState(search.email);
  const [otp, setOtp] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function send() {
    setError("");
    setLoading(true);
    const { error } = await emailOtp.sendVerificationOtp({ email, type: "email-verification" });
    setLoading(false);
    if (error) return setError(error.message || "Could not send code");
    setSent(true);
  }

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const { error } = await emailOtp.verifyEmail({ email, otp });
    setLoading(false);
    if (error) return setError(error.message || "Invalid code");
    router.navigate({ to: "/" });
  }

  return (
    <AuthShell title="Verify your email" subtitle="Confirm your email with a one-time code"
      footer={<Link to="/login" className="font-medium text-primary hover:underline">Back to sign in</Link>}>
      {error && <div className={`${errorClass} mb-4`}>{error}</div>}
      <form onSubmit={verify} className="space-y-4">
        <div>
          <label className={labelClass}>Email</label>
          <input className={fieldClass} type="email" value={email} required
            onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
        </div>
        {sent && (
          <>
            <div className={okClass}>We sent a 6-digit code to {email}.</div>
            <div>
              <label className={labelClass}>Verification code</label>
              <input className={fieldClass} inputMode="numeric" value={otp}
                onChange={(e) => setOtp(e.target.value)} placeholder="123456" />
            </div>
          </>
        )}
        {!sent ? (
          <button type="button" className={primaryBtn} disabled={loading || !email} onClick={send}>
            {loading ? "Sending…" : "Send verification code"}
          </button>
        ) : (
          <button className={primaryBtn} disabled={loading || otp.length < 6}>
            {loading ? "Verifying…" : "Verify email"}
          </button>
        )}
      </form>
    </AuthShell>
  );
}
