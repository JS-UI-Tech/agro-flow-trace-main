import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { FileText, Download } from "lucide-react";
import { useReports } from "@/hooks/api";

export const Route = createFileRoute("/reports")({
  head: () => ({ meta: [{ title: "Reports — AgroTrace" }] }),
  component: ReportsPage,
});

function ReportsPage() {
  const { data: reports = [] } = useReports();
  return (
    <>
      <PageHeader title="Reports" description="Generate operational, quality and compliance reports." />
      <div className="space-y-4 p-6">
        <div className="grid gap-3 rounded-lg border border-border bg-card p-4 shadow-sm md:grid-cols-6">
          <input className="h-9 rounded-md border border-input bg-background px-2 text-sm" placeholder="From" type="date" />
          <input className="h-9 rounded-md border border-input bg-background px-2 text-sm" placeholder="To" type="date" />
          <select className="h-9 rounded-md border border-input bg-background px-2 text-sm"><option>All products</option></select>
          <select className="h-9 rounded-md border border-input bg-background px-2 text-sm"><option>All suppliers</option></select>
          <select className="h-9 rounded-md border border-input bg-background px-2 text-sm"><option>All customers</option></select>
          <select className="h-9 rounded-md border border-input bg-background px-2 text-sm"><option>All statuses</option></select>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {reports.map((r) => (
            <div key={r.id} className="rounded-lg border border-border bg-card p-5 shadow-sm">
              <div className="flex items-start justify-between">
                <div className="rounded-md bg-primary/10 p-2 text-primary"><FileText className="h-5 w-5" /></div>
                <div className="text-right">
                  <div className="text-lg font-semibold text-foreground">{r.value}</div>
                  <div className="text-xs text-muted-foreground">{r.metric}</div>
                </div>
              </div>
              <h3 className="mt-3 text-sm font-semibold text-foreground">{r.title}</h3>
              <p className="mt-1 text-xs text-muted-foreground">Filter by date, product, batch, supplier, customer, location.</p>
              <div className="mt-4 flex gap-2">
                <Button size="sm" className="flex-1">Generate</Button>
                <Button size="sm" variant="outline"><Download className="h-4 w-4" /></Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
