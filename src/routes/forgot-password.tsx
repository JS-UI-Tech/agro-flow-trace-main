import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { forgetPassword } from "@/lib/auth-client";
import { AuthShell, fieldClass, labelClass, primaryBtn, errorClass, okClass } from "@/components/AuthShell";

export const Route = createFileRoute("/forgot-password")({ component: ForgotPasswordPage });

function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const { error } = await forgetPassword({
      email,
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (error) return setError(error.message || "Could not send reset email");
    setDone(true);
  }

  return (
    <AuthShell
      title="Reset your password"
      subtitle="We'll email you a secure reset link"
      footer={
        <Link to="/login" className="font-medium text-primary hover:underline">
          Back to sign in
        </Link>
      }
    >
      {done ? (
        <div className={okClass}>
          If an account exists for <strong>{email}</strong>, a reset link is on its way. Check your inbox.
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          {error && <div className={errorClass}>{error}</div>}
          <div>
            <label className={labelClass}>Email</label>
            <input className={fieldClass} type="email" value={email} required
              onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
          </div>
          <button className={primaryBtn} disabled={loading}>
            {loading ? "Sending…" : "Send reset link"}
          </button>
        </form>
      )}
    </AuthShell>
  );
}
