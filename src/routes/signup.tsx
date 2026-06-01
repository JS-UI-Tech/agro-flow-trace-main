import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { signUp } from "@/lib/auth-client";
import { AuthShell, fieldClass, labelClass, primaryBtn, errorClass } from "@/components/AuthShell";

export const Route = createFileRoute("/signup")({ component: SignupPage });

function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (password.length < 8) return setError("Password must be at least 8 characters.");
    setLoading(true);
    const { error } = await signUp.email({ name, email, password });
    setLoading(false);
    if (error) return setError(error.message || "Could not create account");
    router.navigate({ to: "/" });
  }

  return (
    <AuthShell
      title="Create your account"
      subtitle="Get started with AgroTrace"
      footer={
        <>
          Already have an account?{" "}
          <Link to="/login" className="font-medium text-primary hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      {error && <div className={`${errorClass} mb-4`}>{error}</div>}
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className={labelClass}>Full name</label>
          <input className={fieldClass} value={name} required onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <label className={labelClass}>Email</label>
          <input className={fieldClass} type="email" value={email} required
            onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
        </div>
        <div>
          <label className={labelClass}>Password</label>
          <input className={fieldClass} type="password" value={password} required
            onChange={(e) => setPassword(e.target.value)} autoComplete="new-password"
            placeholder="At least 8 characters" />
        </div>
        <button className={primaryBtn} disabled={loading}>
          {loading ? "Creating…" : "Create account"}
        </button>
      </form>
    </AuthShell>
  );
}
