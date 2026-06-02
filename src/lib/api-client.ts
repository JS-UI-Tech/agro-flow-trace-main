/**
 * Base URL of the AgroTrace API. Resolved identically to src/lib/auth-client.ts:
 * injected at build time via VITE_API_URL; falls back to the production API.
 */
const API_URL =
  (import.meta as unknown as { env?: Record<string, string> }).env?.VITE_API_URL ||
  "https://agro-bk.jsui.digital";

/**
 * Typed fetch helper for the session-guarded AgroTrace API.
 *
 * - Prefixes the configured API base URL.
 * - Always sends cookies (credentials: "include") so the better-auth session is attached.
 * - Sets JSON request/response headers.
 * - Throws on any non-2xx response.
 * - Returns the parsed JSON body typed as T.
 */
export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    credentials: "include",
    ...init,
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...init?.headers,
    },
  });

  if (!response.ok) {
    let body = "";
    try {
      body = await response.text();
    } catch {
      // ignore body read errors
    }
    throw new Error(
      `API request failed: ${response.status} ${response.statusText}${body ? ` — ${body}` : ""}`,
    );
  }

  return (await response.json()) as T;
}
