import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { useSession, updateUser, changePassword, twoFactor, signOut, authClient } from "@/lib/auth-client";
import { PageHeader } from "@/components/PageHeader";
import { fieldClass, labelClass, primaryBtn, errorClass, okClass } from "@/components/AuthShell";

export const Route = createFileRoute("/account")({ component: AccountPage });

function Card({ title, desc, children }: { title: string; desc?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <h2 className="text-base font-semibold text-foreground">{title}</h2>
      {desc && <p className="mt-0.5 text-sm text-muted-foreground">{desc}</p>}
      <div className="mt-4">{children}</div>
    </div>
  );
}

function AccountPage() {
  const router = useRouter();
  const { data: session, isPending } = useSession();
  const user = session?.user;

  const [name, setName] = useState("");
  const [msg, setMsg] = useState("");

  // password
  const [curPw, setCurPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [pwMsg, setPwMsg] = useState("");

  // 2fa
  const [pw2fa, setPw2fa] = useState("");
  const [totpUri, setTotpUri] = useState("");
  const [backup, setBackup] = useState<string[]>([]);
  const [verifyCode, setVerifyCode] = useState("");
  const [tfMsg, setTfMsg] = useState("");

  if (isPending) return <div className="p-6 text-sm text-muted-foreground">Loading…</div>;
  if (!user) {
    router.navigate({ to: "/login", search: { redirect: "/account" } });
    return null;
  }

  async function saveName(e: React.FormEvent) {
    e.preventDefault();
    setMsg("");
    const { error } = await updateUser({ name: name || user!.name });
    setMsg(error ? error.message || "Failed" : "Profile updated.");
  }

  async function doChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setPwMsg("");
    const { error } = await changePassword({ currentPassword: curPw, newPassword: newPw, revokeOtherSessions: true });
    if (error) return setPwMsg(error.message || "Failed");
    setPwMsg("Password changed.");
    setCurPw(""); setNewPw("");
  }

  async function enable2fa(e: React.FormEvent) {
    e.preventDefault();
    setTfMsg("");
    const { data, error } = await twoFactor.enable({ password: pw2fa });
    if (error) return setTfMsg(error.message || "Failed");
    setTotpUri(data?.totpURI || "");
    setBackup(data?.backupCodes || []);
  }

  async function confirm2fa(e: React.FormEvent) {
    e.preventDefault();
    setTfMsg("");
    const { error } = await twoFactor.verifyTotp({ code: verifyCode });
    if (error) return setTfMsg(error.message || "Invalid code");
    setTfMsg("Two-factor authentication is now enabled.");
    setTotpUri(""); setVerifyCode("");
  }

  async function disable2fa() {
    setTfMsg("");
    const { error } = await twoFactor.disable({ password: pw2fa });
    setTfMsg(error ? error.message || "Failed" : "Two-factor disabled.");
  }

  return (
    <div>
      <PageHeader title="Account & Security" description={`Signed in as ${user.email} · role: ${(user as { role?: string }).role ?? "—"}`} />
      <div className="grid gap-5 p-6 lg:grid-cols-2">
        <Card title="Profile">
          <form onSubmit={saveName} className="space-y-3">
            {msg && <div className={okClass}>{msg}</div>}
            <div>
              <label className={labelClass}>Name</label>
              <input className={fieldClass} defaultValue={user.name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div>
              <label className={labelClass}>Email</label>
              <input className={fieldClass} value={user.email} disabled />
            </div>
            <button className={primaryBtn}>Save profile</button>
          </form>
        </Card>

        <Card title="Change password">
          <form onSubmit={doChangePassword} className="space-y-3">
            {pwMsg && <div className={pwMsg.includes("changed") ? okClass : errorClass}>{pwMsg}</div>}
            <div>
              <label className={labelClass}>Current password</label>
              <input className={fieldClass} type="password" value={curPw} onChange={(e) => setCurPw(e.target.value)} required />
            </div>
            <div>
              <label className={labelClass}>New password</label>
              <input className={fieldClass} type="password" value={newPw} onChange={(e) => setNewPw(e.target.value)} required />
            </div>
            <button className={primaryBtn}>Update password</button>
          </form>
        </Card>

        <Card title="Two-factor authentication" desc="Add a TOTP authenticator app for extra security.">
          {tfMsg && <div className={`${tfMsg.includes("enabled") || tfMsg.includes("disabled") ? okClass : errorClass} mb-3`}>{tfMsg}</div>}
          {!totpUri ? (
            <form onSubmit={enable2fa} className="space-y-3">
              <div>
                <label className={labelClass}>Confirm your password</label>
                <input className={fieldClass} type="password" value={pw2fa} onChange={(e) => setPw2fa(e.target.value)} required />
              </div>
              <div className="flex gap-2">
                <button className={primaryBtn}>Enable 2FA</button>
                <button type="button" onClick={disable2fa}
                  className="inline-flex h-10 items-center justify-center rounded-md border border-input px-4 text-sm font-medium hover:bg-accent">
                  Disable
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">Scan with your authenticator app, then enter a code to confirm.</p>
              <div className="flex justify-center rounded-lg border border-border bg-white p-4">
                <QRCodeSVG value={totpUri} size={160} />
              </div>
              {backup.length > 0 && (
                <details className="text-sm">
                  <summary className="cursor-pointer font-medium">Show {backup.length} backup codes</summary>
                  <div className="mt-2 grid grid-cols-2 gap-1 font-mono text-xs">
                    {backup.map((c) => <span key={c}>{c}</span>)}
                  </div>
                </details>
              )}
              <form onSubmit={confirm2fa} className="space-y-3">
                <input className={fieldClass} inputMode="numeric" placeholder="123456"
                  value={verifyCode} onChange={(e) => setVerifyCode(e.target.value)} />
                <button className={primaryBtn}>Confirm & activate</button>
              </form>
            </div>
          )}
        </Card>

        <Card title="Sessions">
          <p className="mb-3 text-sm text-muted-foreground">Sign out of this device or everywhere.</p>
          <div className="flex gap-2">
            <button onClick={() => signOut().then(() => router.navigate({ to: "/login" }))} className={primaryBtn}>
              Sign out
            </button>
            <button
              onClick={() => authClient.revokeOtherSessions()}
              className="inline-flex h-10 items-center justify-center rounded-md border border-input px-4 text-sm font-medium hover:bg-accent">
              Revoke other sessions
            </button>
          </div>
        </Card>
      </div>
    </div>
  );
}
