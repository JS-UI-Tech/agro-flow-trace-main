import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/DataTable";
import { useReturns, useCreate, useUpdate, type ReturnRecord } from "@/hooks/api";
import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

export const Route = createFileRoute("/returns")({
  head: () => ({ meta: [{ title: "Returns — AgroTrace" }] }),
  component: ReturnsPage,
});

function ReturnsPage() {
  const { data: returns = [] } = useReturns();
  const createReturn = useCreate<ReturnRecord, Record<string, unknown>>("/api/returns", "returns");
  const updateReturn = useUpdate<ReturnRecord, Record<string, unknown>>("/api/returns", "returns");
  const [addOpen, setAddOpen] = useState(false);
  const [active, setActive] = useState<ReturnRecord | null>(null);
  const [decision, setDecision] = useState("");

  const openReturn = (r: ReturnRecord) => {
    setActive(r);
    setDecision(r.decision ?? "");
  };

  const handleAdd = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const body = {
      customer: String(data.get("customer") ?? ""),
      product: String(data.get("product") ?? ""),
      batch: String(data.get("batch") ?? ""),
      qty: String(data.get("qty") ?? ""),
      reason: String(data.get("reason") ?? ""),
      decision: String(data.get("decision") ?? ""),
      date: new Date().toISOString().slice(0, 10),
    };
    createReturn.mutate(body, {
      onSuccess: () => {
        toast.success("Return recorded", { description: `${body.customer} · ${body.product}` });
        setAddOpen(false);
      },
      onError: (err) => {
        toast.error("Failed to record return", {
          description: err instanceof Error ? err.message : "Please try again.",
        });
      },
    });
  };

  const handleDecision = () => {
    if (!active) return;
    updateReturn.mutate(
      { id: active.id, body: { decision } },
      {
        onSuccess: () => {
          toast.success("Decision updated", { description: `${active.id} · ${decision}` });
          setActive(null);
        },
        onError: (err) => {
          toast.error("Failed to update decision", {
            description: err instanceof Error ? err.message : "Please try again.",
          });
        },
      },
    );
  };

  return (
    <>
      <PageHeader title="Returns Management" description="Capture and resolve customer returns." actions={<Button onClick={() => setAddOpen(true)}>Record return</Button>} />
      <div className="p-6">
        <DataTable
          data={returns}
          columns={[
            { key: "id", header: "Return" },
            { key: "customer", header: "Customer" },
            { key: "product", header: "Product" },
            { key: "batch", header: "Batch" },
            { key: "qty", header: "Qty" },
            { key: "reason", header: "Reason" },
            { key: "decision", header: "Decision" },
            { key: "date", header: "Date" },
            { key: "actions", header: "", render: (r) => <Button variant="ghost" size="sm" onClick={() => openReturn(r)}>Decision</Button> },
          ]}
        />
      </div>

      <Sheet open={addOpen} onOpenChange={setAddOpen}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>Record return</SheetTitle>
            <SheetDescription>Capture a customer return for resolution.</SheetDescription>
          </SheetHeader>
          <form onSubmit={handleAdd} className="mt-6 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="customer">Customer</Label>
              <Input id="customer" name="customer" placeholder="e.g. Naivas Supermarket" required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="product">Product</Label>
                <Input id="product" name="product" placeholder="e.g. Fresh Milk 500ml" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="batch">Batch</Label>
                <Input id="batch" name="batch" placeholder="BATCH-0042" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="qty">Quantity</Label>
                <Input id="qty" name="qty" placeholder="12 units" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="reason">Reason</Label>
                <Input id="reason" name="reason" placeholder="Damaged packaging" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="decision">Decision</Label>
              <Select name="decision" defaultValue="Pending">
                <SelectTrigger id="decision">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Pending">Pending</SelectItem>
                  <SelectItem value="Refund">Refund</SelectItem>
                  <SelectItem value="Replace">Replace</SelectItem>
                  <SelectItem value="Reject">Reject</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <SheetFooter className="gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setAddOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createReturn.isPending}>
                {createReturn.isPending ? "Saving…" : "Save return"}
              </Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>

      <Sheet open={!!active} onOpenChange={(o) => !o && setActive(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
          {active ? (
            <>
              <SheetHeader>
                <SheetTitle>Return decision</SheetTitle>
                <SheetDescription>{active.id} · {active.customer} · {active.product}</SheetDescription>
              </SheetHeader>
              <div className="mt-6 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="decision-edit">Decision</Label>
                  <Select value={decision} onValueChange={setDecision}>
                    <SelectTrigger id="decision-edit">
                      <SelectValue placeholder="Select decision" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Pending">Pending</SelectItem>
                      <SelectItem value="Refund">Refund</SelectItem>
                      <SelectItem value="Replace">Replace</SelectItem>
                      <SelectItem value="Reject">Reject</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <SheetFooter className="mt-6 gap-2">
                <Button variant="outline" onClick={() => setActive(null)}>
                  Cancel
                </Button>
                <Button onClick={handleDecision} disabled={updateReturn.isPending}>
                  {updateReturn.isPending ? "Saving…" : "Save decision"}
                </Button>
              </SheetFooter>
            </>
          ) : null}
        </SheetContent>
      </Sheet>
    </>
  );
}
