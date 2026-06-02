import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/DataTable";
import { StatusBadge } from "@/components/StatusBadge";
import { useRecalls, useCreate, useUpdate, type Recall } from "@/hooks/api";
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

export const Route = createFileRoute("/recalls")({
  head: () => ({ meta: [{ title: "Recall Management — AgroTrace" }] }),
  component: RecallsPage,
});

function RecallsPage() {
  const { data: recalls = [] } = useRecalls();
  const createRecall = useCreate<Recall, Partial<Recall>>("/api/recalls", "recalls");
  const updateRecall = useUpdate<Recall, Partial<Recall>>("/api/recalls", "recalls");
  const [addOpen, setAddOpen] = useState(false);
  const [active, setActive] = useState<Recall | null>(null);

  const handleAdd = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const body: Partial<Recall> = {
      product: String(data.get("product") ?? ""),
      batch: String(data.get("batch") ?? ""),
      reason: String(data.get("reason") ?? ""),
      produced: String(data.get("produced") ?? ""),
      dispatched: String(data.get("dispatched") ?? ""),
      recovered: String(data.get("recovered") ?? ""),
      status: String(data.get("status") ?? "Open"),
      opened: new Date().toISOString().slice(0, 10),
    };
    createRecall.mutate(body, {
      onSuccess: () => {
        toast.success("Recall opened", { description: `${body.product} · batch ${body.batch}` });
        setAddOpen(false);
      },
      onError: (err) =>
        toast.error("Failed to open recall", {
          description: err instanceof Error ? err.message : "Please try again.",
        }),
    });
  };

  const handleStatus = (status: string) => {
    if (!active) return;
    updateRecall.mutate(
      { id: active.id, body: { status } },
      {
        onSuccess: () => {
          toast.success("Recall updated", { description: `${active.id} → ${status}` });
          setActive(null);
        },
        onError: (err) =>
          toast.error("Failed to update recall", {
            description: err instanceof Error ? err.message : "Please try again.",
          }),
      },
    );
  };

  return (
    <>
      <PageHeader
        title="Recall Management"
        description="Open recall cases, identify affected lots and track recovery."
        actions={
          <Button variant="destructive" onClick={() => setAddOpen(true)}>
            Open new recall
          </Button>
        }
      />
      <div className="p-6">
        <DataTable
          data={recalls}
          columns={[
            { key: "id", header: "Case" },
            { key: "product", header: "Product" },
            { key: "batch", header: "Batch" },
            { key: "reason", header: "Reason" },
            { key: "produced", header: "Produced" },
            { key: "dispatched", header: "Dispatched" },
            { key: "recovered", header: "Recovered" },
            { key: "opened", header: "Opened" },
            { key: "status", header: "Status", render: (r) => <StatusBadge status={r.status} /> },
            { key: "actions", header: "", render: (r) => <Button variant="ghost" size="sm" onClick={() => setActive(r)}>Manage</Button> },
          ]}
        />
      </div>

      <Sheet open={addOpen} onOpenChange={setAddOpen}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>Open new recall</SheetTitle>
            <SheetDescription>Register a recall case for an affected lot.</SheetDescription>
          </SheetHeader>
          <form onSubmit={handleAdd} className="mt-6 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="product">Product</Label>
              <Input id="product" name="product" placeholder="e.g. Fresh Milk 500ml" required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="batch">Batch</Label>
                <Input id="batch" name="batch" placeholder="BAT-0094" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select name="status" defaultValue="Open">
                  <SelectTrigger id="status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Open">Open</SelectItem>
                    <SelectItem value="In progress">In progress</SelectItem>
                    <SelectItem value="Closed">Closed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="reason">Reason</Label>
              <Input id="reason" name="reason" placeholder="e.g. Contamination risk" required />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label htmlFor="produced">Produced</Label>
                <Input id="produced" name="produced" placeholder="0" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dispatched">Dispatched</Label>
                <Input id="dispatched" name="dispatched" placeholder="0" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="recovered">Recovered</Label>
                <Input id="recovered" name="recovered" placeholder="0" />
              </div>
            </div>
            <SheetFooter className="gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setAddOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="destructive" disabled={createRecall.isPending}>
                {createRecall.isPending ? "Opening…" : "Open recall"}
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
                <SheetTitle>{active.id}</SheetTitle>
                <SheetDescription>{active.product} · batch {active.batch}</SheetDescription>
              </SheetHeader>
              <div className="mt-6 space-y-6">
                <div className="flex flex-wrap gap-2">
                  <StatusBadge status={active.status} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="status-update">Update status</Label>
                  <Select defaultValue={active.status} onValueChange={handleStatus}>
                    <SelectTrigger id="status-update">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Open">Open</SelectItem>
                      <SelectItem value="In progress">In progress</SelectItem>
                      <SelectItem value="Closed">Closed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <SheetFooter className="mt-6 gap-2">
                <Button variant="outline" onClick={() => setActive(null)}>Close</Button>
                <Button
                  variant="destructive"
                  disabled={updateRecall.isPending}
                  onClick={() => handleStatus("Closed")}
                >
                  {updateRecall.isPending ? "Saving…" : "Close recall"}
                </Button>
              </SheetFooter>
            </>
          ) : null}
        </SheetContent>
      </Sheet>
    </>
  );
}
