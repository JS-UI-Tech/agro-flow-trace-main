import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/DataTable";
import { StatusBadge } from "@/components/StatusBadge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus } from "lucide-react";

export const Route = createFileRoute("/production-planning")({
  head: () => ({ meta: [{ title: "Production Planning — AgroTrace" }] }),
  component: PlanningPage,
});

interface Order extends Record<string, unknown> {
  id: string;
  product: string;
  recipe: string;
  qty: string;
  line: string;
  supervisor: string;
  start: string;
  end: string;
  status: string;
  notes: string;
}

const INITIAL_ORDERS: Order[] = [
  { id: "PO-2026-218", product: "Mango Juice 500ml", recipe: "REC-MJ-500", qty: "10,000 units", line: "Line A", supervisor: "J. Otieno", start: "2026-05-19 08:00", end: "2026-05-19 14:00", status: "In Process", notes: "Priority shipment for Westlands DC." },
  { id: "PO-2026-217", product: "Pasteurized Milk 1L", recipe: "REC-PM-1L", qty: "2,400 units", line: "Line B", supervisor: "M. Wanjiku", start: "2026-05-19 06:00", end: "2026-05-19 11:30", status: "Packaging", notes: "" },
  { id: "PO-2026-216", product: "Maize Flour 2kg", recipe: "REC-MF-2K", qty: "4,000 units", line: "Line C", supervisor: "P. Kimani", start: "2026-05-20 07:00", end: "2026-05-20 16:00", status: "Pending", notes: "Awaiting maize delivery from Supplier KE-014." },
];

function emptyDraft(): Order {
  return {
    id: "",
    product: "",
    recipe: "",
    qty: "",
    line: "Line A",
    supervisor: "",
    start: "",
    end: "",
    status: "Pending",
    notes: "",
  };
}

function PlanningPage() {
  const [orders, setOrders] = useState<Order[]>(INITIAL_ORDERS);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [draft, setDraft] = useState<Order>(() => emptyDraft());

  const selected = useMemo(
    () => orders.find((o) => o.id === selectedId) ?? null,
    [orders, selectedId],
  );

  function openNew() {
    setDraft(emptyDraft());
    setEditorOpen(true);
  }

  function saveDraft() {
    if (!draft.id || !draft.product) return;
    setOrders((prev) =>
      prev.some((o) => o.id === draft.id) ? prev : [draft, ...prev],
    );
    setEditorOpen(false);
  }

  return (
    <>
      <PageHeader
        title="Production Planning"
        description="Plan orders, reserve raw materials and assign lines."
        actions={
          <Button onClick={openNew}>
            <Plus /> New production order
          </Button>
        }
      />
      <div className="p-6">
        <DataTable
          data={orders}
          columns={[
            { key: "id", header: "Order" },
            { key: "product", header: "Product" },
            { key: "qty", header: "Target qty" },
            { key: "line", header: "Line" },
            { key: "start", header: "Start" },
            { key: "end", header: "End" },
            { key: "status", header: "Status", render: (r) => <StatusBadge status={r.status} /> },
            {
              key: "actions",
              header: "",
              render: (r) => (
                <Button variant="outline" size="sm" onClick={() => setSelectedId(r.id)}>
                  View
                </Button>
              ),
            },
          ]}
        />
      </div>

      {/* Detail sheet */}
      <Sheet open={!!selected} onOpenChange={(o) => !o && setSelectedId(null)}>
        <SheetContent className="sm:max-w-lg overflow-y-auto">
          {selected && (
            <>
              <SheetHeader>
                <SheetTitle>{selected.id}</SheetTitle>
                <SheetDescription>
                  {selected.product} • {selected.recipe}
                </SheetDescription>
              </SheetHeader>
              <div className="mt-6 grid grid-cols-2 gap-3 text-sm">
                {[
                  ["Target qty", selected.qty],
                  ["Line", selected.line],
                  ["Supervisor", selected.supervisor],
                  ["Status", selected.status],
                  ["Start", selected.start],
                  ["End", selected.end],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-md border border-border bg-card p-3">
                    <div className="text-xs uppercase text-muted-foreground">{label}</div>
                    <div className="font-medium">{value || "—"}</div>
                  </div>
                ))}
              </div>
              {selected.notes && (
                <div className="mt-4">
                  <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Notes
                  </div>
                  <p className="mt-1 rounded-md border border-border bg-card p-3 text-sm">
                    {selected.notes}
                  </p>
                </div>
              )}
              <SheetFooter className="mt-6">
                <Button variant="outline" onClick={() => setSelectedId(null)}>
                  Close
                </Button>
              </SheetFooter>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Editor sheet */}
      <Sheet open={editorOpen} onOpenChange={setEditorOpen}>
        <SheetContent className="sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>New production order</SheetTitle>
            <SheetDescription>
              Schedule a batch and assign it to a production line.
            </SheetDescription>
          </SheetHeader>
          <div className="mt-6 grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Order ID</Label>
              <Input
                value={draft.id}
                onChange={(e) => setDraft({ ...draft, id: e.target.value })}
                placeholder="PO-2026-219"
              />
            </div>
            <div className="space-y-1">
              <Label>Recipe code</Label>
              <Input
                value={draft.recipe}
                onChange={(e) => setDraft({ ...draft, recipe: e.target.value })}
                placeholder="REC-MJ-500"
              />
            </div>
            <div className="col-span-2 space-y-1">
              <Label>Product</Label>
              <Input
                value={draft.product}
                onChange={(e) => setDraft({ ...draft, product: e.target.value })}
                placeholder="Mango Juice 500ml"
              />
            </div>
            <div className="space-y-1">
              <Label>Target qty</Label>
              <Input
                value={draft.qty}
                onChange={(e) => setDraft({ ...draft, qty: e.target.value })}
                placeholder="10,000 units"
              />
            </div>
            <div className="space-y-1">
              <Label>Line</Label>
              <Select
                value={draft.line}
                onValueChange={(v) => setDraft({ ...draft, line: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Line A">Line A</SelectItem>
                  <SelectItem value="Line B">Line B</SelectItem>
                  <SelectItem value="Line C">Line C</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2 space-y-1">
              <Label>Supervisor</Label>
              <Input
                value={draft.supervisor}
                onChange={(e) => setDraft({ ...draft, supervisor: e.target.value })}
                placeholder="J. Otieno"
              />
            </div>
            <div className="space-y-1">
              <Label>Start</Label>
              <Input
                type="datetime-local"
                value={draft.start}
                onChange={(e) => setDraft({ ...draft, start: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label>End</Label>
              <Input
                type="datetime-local"
                value={draft.end}
                onChange={(e) => setDraft({ ...draft, end: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label>Status</Label>
              <Select
                value={draft.status}
                onValueChange={(v) => setDraft({ ...draft, status: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Pending">Pending</SelectItem>
                  <SelectItem value="In Process">In Process</SelectItem>
                  <SelectItem value="Packaging">Packaging</SelectItem>
                  <SelectItem value="Completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2 space-y-1">
              <Label>Notes</Label>
              <Textarea
                value={draft.notes}
                onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
                placeholder="Optional context for the line supervisor."
              />
            </div>
          </div>
          <SheetFooter className="mt-6">
            <Button variant="outline" onClick={() => setEditorOpen(false)}>
              Cancel
            </Button>
            <Button onClick={saveDraft} disabled={!draft.id || !draft.product}>
              Create order
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </>
  );
}
