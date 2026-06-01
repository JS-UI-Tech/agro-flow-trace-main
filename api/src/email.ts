import { env } from "./env";

/**
 * Minimal transactional email. If RESEND_API_KEY is configured we send via
 * the Resend HTTP API; otherwise we log the message (so every auth flow —
 * verification, password reset, OTP — is fully exercisable in dev/preview
 * without an email provider). Swap in any provider here later.
 */
export async function sendEmail(opts: {
  to: string;
  subject: string;
  text: string;
  html?: string;
}): Promise<void> {
  if (!env.resendApiKey) {
    console.log(
      `\n[email:stub] to=${opts.to}\n  subject: ${opts.subject}\n  ${opts.text}\n`,
    );
    return;
  }
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: env.emailFrom,
        to: opts.to,
        subject: opts.subject,
        text: opts.text,
        html: opts.html ?? `<pre>${opts.text}</pre>`,
      }),
    });
    if (!res.ok) {
      console.error("[email] Resend failed:", res.status, await res.text());
    }
  } catch (err) {
    console.error("[email] send error:", (err as Error)?.message);
  }
}
