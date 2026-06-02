import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";
import { useTrace } from "@/hooks/api";

export const Route = createFileRoute("/traceability")({
  head: () => ({ meta: [{ title: "Traceability Search — AgroTrace" }] }),
  component: TracePage,
});

function formatLabel(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string" || typeof value === "number") return String(value);
  const r = value as Record<string, unknown>;
  const primary = r.product ?? r.material ?? r.name ?? r.customer ?? r.reason ?? r.title;
  const id = r.id ?? r.code ?? r.batch ?? r.lot;
  if (primary && id) return `${id} ${primary}`;
  if (primary) return String(primary);
  if (id) return String(id);
  return JSON.stringify(value);
}

function timeOf(value: unknown): string {
  if (value && typeof value === "object") {
    const r = value as Record<string, unknown>;
    return String(r.time ?? r.date ?? r.received ?? r.mfg ?? r.due ?? r.opened ?? "");
  }
  return "";
}

function TracePage() {
  const [code, setCode] = useState("FG-2026-0990");
  const { data: trace } = useTrace(code);

  const matches = trace?.matches ?? [];
  const related = trace?.related ?? [];

  return (
    <>
      <PageHeader title="Traceability Search" description="Trace any product backward to suppliers or forward to consumers." actions={<Button variant="outline">Export trace report</Button>} />
      <div className="space-y-4 p-6">
        <div className="rounded-lg border border-border bg-card p-5 shadow-sm">
          <div className="grid gap-3 md:grid-cols-3">
            <div className="md:col-span-2"><label className="text-xs text-muted-foreground">Query (QR / batch / lot)</label><div className="mt-1 flex gap-2"><Search className="absolute ml-3 mt-2.5 h-4 w-4 text-muted-foreground" /><input className="h-10 flex-1 rounded-md border border-input bg-card pl-9 pr-3" placeholder="FG-2026-0990" value={code} onChange={(e) => setCode(e.target.value)} /></div></div>
            <div><label className="text-xs text-muted-foreground">Date range</label><input className="mt-1 h-10 w-full rounded-md border border-input bg-card px-2" defaultValue="2026-05-01 → 2026-05-19" /></div>
          </div>
          <div className="mt-3 flex flex-wrap gap-2 text-xs">
            {["By supplier", "By customer", "By raw lot", "By production batch", "By FG lot"].map((c) => (
              <button key={c} className="rounded-full border border-border bg-muted/40 px-3 py-1">{c}</button>
            ))}
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-lg border border-border bg-card p-5 shadow-sm">
            <h3 className="text-sm font-semibold">Backward trace</h3>
            <p className="text-xs text-muted-foreground">Matched records for this code</p>
            <ol className="mt-4 space-y-4 border-l border-border pl-5">
              {matches.length === 0 ? (
                <li className="text-sm text-muted-foreground">No matches{code ? ` for "${code}"` : ""}.</li>
              ) : (
                matches.map((m, i) => (
                  <li key={i} className="relative">
                    <span className="absolute -left-[27px] top-1 h-3 w-3 rounded-full border-2 border-primary bg-background" />
                    <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{m.type}</div>
                    <div className="text-sm font-medium">{formatLabel(m.record)}</div>
                    <div className="text-xs text-muted-foreground">{timeOf(m.record)}</div>
                  </li>
                ))
              )}
            </ol>
          </div>
          <div className="rounded-lg border border-border bg-card p-5 shadow-sm">
            <h3 className="text-sm font-semibold">Forward trace</h3>
            <p className="text-xs text-muted-foreground">Related records (downstream lineage)</p>
            <ol className="mt-4 space-y-4 border-l border-border pl-5">
              {related.length === 0 ? (
                <li className="text-sm text-muted-foreground">No related records{code ? ` for "${code}"` : ""}.</li>
              ) : (
                related.map((r, i) => (
                  <li key={i} className="relative">
                    <span className="absolute -left-[27px] top-1 h-3 w-3 rounded-full border-2 border-primary bg-background" />
                    <div className="text-sm font-medium">{formatLabel(r)}</div>
                    <div className="text-xs text-muted-foreground">{timeOf(r)}</div>
                  </li>
                ))
              )}
            </ol>
          </div>
        </div>
      </div>
    </>
  );
}
