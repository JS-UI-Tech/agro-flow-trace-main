import { createFileRoute, Link, useRouter, useSearch } from "@tanstack/react-router";
import { useState } from "react";
import { resetPassword } from "@/lib/auth-client";
import { AuthShell, fieldClass, labelClass, primaryBtn, errorClass } from "@/components/AuthShell";

export const Route = createFileRoute("/reset-password")({
  validateSearch: (s: Record<string, unknown>) => ({
    token: (s.token as string) || "",
    error: (s.error as string) || "",
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const router = useRouter();
  const { token, error: linkError } = useSearch({ from: "/reset-password" });
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (password.length < 8) return setError("Password must be at least 8 characters.");
    if (password !== confirm) return setError("Passwords do not match.");
    setLoading(true);
    const { error } = await resetPassword({ newPassword: password, token });
    setLoading(false);
    if (error) return setError(error.message || "Could not reset password");
    router.navigate({ to: "/login" });
  }

  const invalid = !token || linkError === "INVALID_TOKEN";

  return (
    <AuthShell title="Choose a new password" subtitle="Set a strong password for your account"
      footer={<Link to="/login" className="font-medium text-primary hover:underline">Back to sign in</Link>}>
      {invalid ? (
        <div className={errorClass}>
          This reset link is invalid or has expired.{" "}
          <Link to="/forgot-password" className="font-medium underline">Request a new one</Link>.
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          {error && <div className={errorClass}>{error}</div>}
          <div>
            <label className={labelClass}>New password</label>
            <input className={fieldClass} type="password" value={password} required
              onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" />
          </div>
          <div>
            <label className={labelClass}>Confirm password</label>
            <input className={fieldClass} type="password" value={confirm} required
              onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" />
          </div>
          <button className={primaryBtn} disabled={loading}>
            {loading ? "Updating…" : "Update password"}
          </button>
        </form>
      )}
    </AuthShell>
  );
}
