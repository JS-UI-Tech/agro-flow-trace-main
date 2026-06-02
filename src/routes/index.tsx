import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import {
  Activity,
  PackageCheck,
  AlertTriangle,
  Clock,
  Truck,
  XCircle,
  Wheat,
  TrendingDown,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { PageHeader } from "@/components/PageHeader";
import { KpiCard } from "@/components/KpiCard";
import { StatusBadge } from "@/components/StatusBadge";
import { useDashboard, useCreate, useUpdate } from "@/hooks/api";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dashboard — AgroTrace" },
      { name: "description", content: "Live overview of production, QC, dispatch and compliance." },
    ],
  }),
  component: Index,
});

const PIE_COLORS = ["hsl(0 72% 51%)", "hsl(38 92% 50%)", "hsl(152 60% 40%)"];

function Index() {
  const { data: dash } = useDashboard();
  const productionByProduct = dash?.productionByProduct ?? [];
  const qcTrend = dash?.qcTrend ?? [];
  const expiryRisk = dash?.expiryRisk ?? [];
  const dispatchByCustomer = dash?.dispatchByCustomer ?? [];
  const wasteByReason = dash?.wasteByReason ?? [];
  const recentBatches = dash?.recentBatches ?? [];
  const kpis = dash?.kpis;

  const [orderOpen, setOrderOpen] = useState(false);
  const createOrder = useCreate("/api/production-orders", "production-orders");
  const updateOrder = useUpdate("/api/production-orders", "production-orders");
  void updateOrder;

  const handleExport = () => {
    const rows = [
      ["Metric", "Value"],
      ["Active production batches", String(kpis?.activeBatches ?? "")],
      ["Raw material lots today", String(kpis?.rawLotsToday ?? "")],
      ["FG awaiting QC release", String(kpis?.fgAwaitingQc ?? "")],
      ["Expiring stock (<30d)", String(kpis?.expiringStock ?? "")],
      ["Open recall cases", String(kpis?.openRecalls ?? "")],
      ["QC failures (7d)", String(kpis?.qcFailures ?? "")],
      ["Dispatched this week", String(kpis?.dispatchedThisWeek ?? "")],
      ["Supplier rejection rate", `${kpis?.supplierRejectionRate ?? ""}%`],
    ];
    const csv = rows.map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `agrotrace-dashboard-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("Dashboard exported", { description: "CSV downloaded successfully." });
  };

  const handleCreateOrder = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const body = {
      product: formData.get("product") as string,
      recipe: formData.get("recipe") as string,
      line: formData.get("line") as string,
      qty: Number(formData.get("qty")),
      unit: formData.get("unit") as string,
      start: formData.get("start") as string,
      supervisor: formData.get("supervisor") as string,
      priority: formData.get("priority") as string,
      notes: formData.get("notes") as string,
      createdAt: new Date().toISOString(),
    };
    createOrder.mutate(body, {
      onSuccess: () => {
        toast.success("Production order created", {
          description: `${body.product} scheduled.`,
        });
        setOrderOpen(false);
      },
      onError: (err: unknown) => {
        toast.error("Failed to create production order", {
          description: err instanceof Error ? err.message : "Please try again.",
        });
      },
    });
  };

  return (
    <>
      <PageHeader
        title="Operations Dashboard"
        description="Mwea Processing Plant • Shift A • Tuesday, May 19 2026"
        actions={
          <>
            <Button variant="outline" onClick={handleExport}>Export</Button>
            <Button onClick={() => setOrderOpen(true)}>New Production Order</Button>
          </>
        }
      />
      <div className="space-y-6 p-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard label="Active production batches" value={kpis?.activeBatches ?? 0} delta="+3 vs yesterday" trend="up" icon={Activity} />
          <KpiCard label="Raw material lots today" value={kpis?.rawLotsToday ?? 0} delta="2 pending QC" trend="flat" icon={Wheat} />
          <KpiCard label="FG awaiting QC release" value={kpis?.fgAwaitingQc ?? 0} delta="9,400 units" trend="flat" icon={PackageCheck} />
          <KpiCard label="Expiring stock (<30d)" value={kpis?.expiringStock ?? 0} delta="+4 this week" trend="down" icon={Clock} />
          <KpiCard label="Open recall cases" value={kpis?.openRecalls ?? 0} delta="1 high severity" trend="down" icon={AlertTriangle} />
          <KpiCard label="QC failures (7d)" value={kpis?.qcFailures ?? 0} delta="−18% vs prior" trend="up" icon={XCircle} />
          <KpiCard label="Dispatched this week" value={(kpis?.dispatchedThisWeek ?? 0).toLocaleString()} delta="units across 5 routes" trend="up" icon={Truck} />
          <KpiCard label="Supplier rejection rate" value={`${kpis?.supplierRejectionRate ?? 0}%`} delta="target ≤ 4%" trend="up" icon={TrendingDown} />
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <div className="rounded-lg border border-border bg-card p-5 shadow-sm lg:col-span-2">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-foreground">Production volume by product</h3>
                <p className="text-xs text-muted-foreground">Liters / kg produced today</p>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={productionByProduct}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="product" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="volume" fill="oklch(0.55 0.15 152)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="rounded-lg border border-border bg-card p-5 shadow-sm">
            <div className="mb-4">
              <h3 className="text-sm font-semibold text-foreground">Stock by expiry risk</h3>
              <p className="text-xs text-muted-foreground">Across all FG lots</p>
            </div>
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={expiryRisk} dataKey="value" nameKey="name" innerRadius={50} outerRadius={90}>
                  {expiryRisk.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i]} />
                  ))}
                </Pie>
                <Legend wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <div className="rounded-lg border border-border bg-card p-5 shadow-sm lg:col-span-2">
            <h3 className="mb-4 text-sm font-semibold text-foreground">QC pass / fail trend</h3>
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={qcTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="day" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Line type="monotone" dataKey="pass" stroke="oklch(0.55 0.15 152)" strokeWidth={2} />
                <Line type="monotone" dataKey="fail" stroke="oklch(0.6 0.22 27)" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="rounded-lg border border-border bg-card p-5 shadow-sm">
            <h3 className="mb-4 text-sm font-semibold text-foreground">Waste by reason (kg/L)</h3>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={wasteByReason} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis type="number" tick={{ fontSize: 12 }} />
                <YAxis dataKey="reason" type="category" width={90} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="value" fill="oklch(0.65 0.16 40)" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <div className="rounded-lg border border-border bg-card p-5 shadow-sm lg:col-span-2">
            <h3 className="mb-4 text-sm font-semibold text-foreground">Dispatch volume by customer</h3>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={dispatchByCustomer}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="customer" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="volume" fill="oklch(0.5 0.12 200)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="rounded-lg border border-border bg-card p-5 shadow-sm">
            <h3 className="mb-4 text-sm font-semibold text-foreground">Live production batches</h3>
            <ul className="space-y-3">
              {recentBatches.slice(0, 4).map((b) => (
                <li key={b.id} className="flex items-start justify-between gap-3 border-b border-border pb-3 last:border-0 last:pb-0">
                  <div>
                    <div className="text-sm font-medium text-foreground">{b.product}</div>
                    <div className="text-xs text-muted-foreground">{b.id} • {b.line} • {b.supervisor}</div>
                  </div>
                  <StatusBadge status={b.status} />
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      <Sheet open={orderOpen} onOpenChange={setOrderOpen}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>New Production Order</SheetTitle>
            <SheetDescription>
              Schedule a new batch on the production floor.
            </SheetDescription>
          </SheetHeader>
          <form onSubmit={handleCreateOrder} className="mt-6 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="product">Product</Label>
              <Select name="product" defaultValue="Mango Juice 500ml">
                <SelectTrigger id="product">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Mango Juice 500ml">Mango Juice 500ml</SelectItem>
                  <SelectItem value="Pasteurized Milk 1L">Pasteurized Milk 1L</SelectItem>
                  <SelectItem value="Maize Flour 2kg">Maize Flour 2kg</SelectItem>
                  <SelectItem value="Pineapple Juice 1L">Pineapple Juice 1L</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="recipe">Recipe version</Label>
                <Input id="recipe" name="recipe" defaultValue="v2.1" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="line">Production line</Label>
                <Select name="line" defaultValue="Line A">
                  <SelectTrigger id="line">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Line A">Line A</SelectItem>
                    <SelectItem value="Line B">Line B</SelectItem>
                    <SelectItem value="Line C">Line C</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="qty">Target quantity</Label>
                <Input id="qty" name="qty" type="number" defaultValue="4800" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="unit">Unit</Label>
                <Select name="unit" defaultValue="L">
                  <SelectTrigger id="unit">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="L">Liters</SelectItem>
                    <SelectItem value="kg">Kilograms</SelectItem>
                    <SelectItem value="units">Units</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="start">Start time</Label>
                <Input id="start" name="start" type="datetime-local" defaultValue="2026-05-20T08:00" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="supervisor">Supervisor</Label>
                <Select name="supervisor" defaultValue="J. Otieno">
                  <SelectTrigger id="supervisor">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="J. Otieno">J. Otieno</SelectItem>
                    <SelectItem value="M. Wanjiku">M. Wanjiku</SelectItem>
                    <SelectItem value="P. Kimani">P. Kimani</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="priority">Priority</Label>
              <Select name="priority" defaultValue="Normal">
                <SelectTrigger id="priority">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Low">Low</SelectItem>
                  <SelectItem value="Normal">Normal</SelectItem>
                  <SelectItem value="High">High</SelectItem>
                  <SelectItem value="Urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea id="notes" name="notes" rows={3} placeholder="Optional remarks for the shift team..." />
            </div>
            <SheetFooter className="flex-row justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setOrderOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">Create order</Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>
    </>
  );
}
