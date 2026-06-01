import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";

export const Route = createFileRoute("/traceability")({
  head: () => ({ meta: [{ title: "Traceability Search — AgroTrace" }] }),
  component: TracePage,
});

const backward = [
  { t: "Dispatched", d: "DSP-7781 → Carrefour Westgate", time: "2026-05-19 13:10" },
  { t: "FG Released", d: "FG-2026-0990 (2,300 units)", time: "2026-05-19 12:45" },
  { t: "Packaging", d: "PK-3319 TetraPak 1L (PRI-5520)", time: "2026-05-19 11:50" },
  { t: "Production batch", d: "PB-2026-0450 (Line B)", time: "2026-05-19 06:00 — 11:30" },
  { t: "QC checks", d: "Fat 3.5% • Temp 85 °C • Pass", time: "2026-05-19 07:40" },
  { t: "Raw material", d: "RM-2024-1001 Raw Milk 2,400 L", time: "2026-05-19 04:15" },
  { t: "Supplier", d: "Sunrise Dairy Coop (SDC-9921)", time: "2026-05-19 03:30" },
];

function TracePage() {
  return (
    <>
      <PageHeader title="Traceability Search" description="Trace any product backward to suppliers or forward to consumers." actions={<Button variant="outline">Export trace report</Button>} />
      <div className="space-y-4 p-6">
        <div className="rounded-lg border border-border bg-card p-5 shadow-sm">
          <div className="grid gap-3 md:grid-cols-3">
            <div className="md:col-span-2"><label className="text-xs text-muted-foreground">Query (QR / batch / lot)</label><div className="mt-1 flex gap-2"><Search className="absolute ml-3 mt-2.5 h-4 w-4 text-muted-foreground" /><input className="h-10 flex-1 rounded-md border border-input bg-card pl-9 pr-3" placeholder="FG-2026-0990" defaultValue="FG-2026-0990" /></div></div>
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
            <p className="text-xs text-muted-foreground">From finished product to raw material</p>
            <ol className="mt-4 space-y-4 border-l border-border pl-5">
              {backward.map((e, i) => (
                <li key={i} className="relative">
                  <span className="absolute -left-[27px] top-1 h-3 w-3 rounded-full border-2 border-primary bg-background" />
                  <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{e.t}</div>
                  <div className="text-sm font-medium">{e.d}</div>
                  <div className="text-xs text-muted-foreground">{e.time}</div>
                </li>
              ))}
            </ol>
          </div>
          <div className="rounded-lg border border-border bg-card p-5 shadow-sm">
            <h3 className="text-sm font-semibold">Forward trace</h3>
            <p className="text-xs text-muted-foreground">From raw material to consumers</p>
            <ol className="mt-4 space-y-4 border-l border-border pl-5">
              {[
                { t: "Raw lot", d: "RM-2024-1001 Raw Milk", time: "Received 04:15" },
                { t: "Used in batch", d: "PB-2026-0450", time: "06:00" },
                { t: "Packaged as", d: "FG-2026-0990 (2,300 units)", time: "11:50" },
                { t: "Released", d: "QA Officer L. Mutua", time: "12:45" },
                { t: "Dispatched", d: "DSP-7781 → Carrefour Westgate (800u)", time: "13:10" },
                { t: "Dispatched", d: "DSP-7782 → Naivas DC (1,200u)", time: "13:25" },
                { t: "Consumer scans", d: "117 QR verifications", time: "ongoing" },
              ].map((e, i) => (
                <li key={i} className="relative">
                  <span className="absolute -left-[27px] top-1 h-3 w-3 rounded-full border-2 border-primary bg-background" />
                  <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{e.t}</div>
                  <div className="text-sm font-medium">{e.d}</div>
                  <div className="text-xs text-muted-foreground">{e.time}</div>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>
    </>
  );
}
