import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { twoFactor } from "@/lib/auth-client";
import { AuthShell, fieldClass, labelClass, primaryBtn, errorClass } from "@/components/AuthShell";

export const Route = createFileRoute("/two-factor")({ component: TwoFactorPage });

/** Two-factor challenge shown after a password sign-in when 2FA is enabled. */
function TwoFactorPage() {
  const router = useRouter();
  const [useBackup, setUseBackup] = useState(false);
  const [code, setCode] = useState("");
  const [trustDevice, setTrustDevice] = useState(true);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const { error } = useBackup
      ? await twoFactor.verifyBackupCode({ code })
      : await twoFactor.verifyTotp({ code, trustDevice });
    setLoading(false);
    if (error) return setError(error.message || "Invalid code");
    router.navigate({ to: "/" });
  }

  return (
    <AuthShell
      title="Two-factor authentication"
      subtitle={useBackup ? "Enter one of your backup codes" : "Enter the 6-digit code from your authenticator app"}
      footer={<Link to="/login" className="font-medium text-primary hover:underline">Back to sign in</Link>}
    >
      {error && <div className={`${errorClass} mb-4`}>{error}</div>}
      <form onSubmit={verify} className="space-y-4">
        <div>
          <label className={labelClass}>{useBackup ? "Backup code" : "Authentication code"}</label>
          <input className={fieldClass} inputMode={useBackup ? "text" : "numeric"} value={code}
            onChange={(e) => setCode(e.target.value)} placeholder={useBackup ? "xxxxx-xxxxx" : "123456"} autoFocus />
        </div>
        {!useBackup && (
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            <input type="checkbox" checked={trustDevice} onChange={(e) => setTrustDevice(e.target.checked)} />
            Trust this device for 60 days
          </label>
        )}
        <button className={primaryBtn} disabled={loading || code.length < 6}>
          {loading ? "Verifying…" : "Verify"}
        </button>
        <button type="button" onClick={() => setUseBackup((v) => !v)}
          className="w-full text-center text-sm text-primary hover:underline">
          {useBackup ? "Use authenticator app instead" : "Use a backup code instead"}
        </button>
      </form>
    </AuthShell>
  );
}
