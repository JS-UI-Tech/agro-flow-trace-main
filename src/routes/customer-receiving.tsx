import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/DataTable";
import { StatusBadge } from "@/components/StatusBadge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useDispatches, useCreate, useUpdate } from "@/hooks/api";

export const Route = createFileRoute("/customer-receiving")({
  head: () => ({ meta: [{ title: "Customer Receiving — AgroTrace" }] }),
  component: ReceivingPage,
});

function ReceivingPage() {
  const { data: dispatches = [] } = useDispatches();
  const createDispatch = useCreate("/api/dispatches", "dispatches");
  const updateDispatch = useUpdate("/api/dispatches", "dispatches");

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ customer: "", product: "", qty: "", destination: "" });

  const handleConfirm = (id: string) => {
    updateDispatch.mutate(
      { id, body: { status: "Delivered" } },
      {
        onSuccess: () => toast.success("Receipt confirmed"),
        onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Failed to confirm receipt"),
      }
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createDispatch.mutate(
      { ...form, qty: Number(form.qty), status: "In Transit", createdAt: new Date().toISOString() },
      {
        onSuccess: () => {
          setOpen(false);
          setForm({ customer: "", product: "", qty: "", destination: "" });
          toast.success("Delivery recorded");
        },
        onError: (err: unknown) => toast.error(err instanceof Error ? err.message : "Failed to record delivery"),
      }
    );
  };

  return (
    <>
      <PageHeader title="Customer / Distributor Receiving" description="Confirm deliveries, record short / damaged quantities." actions={<Button onClick={() => setOpen(true)}>Scan delivery</Button>} />
      <div className="p-6">
        <DataTable
          data={dispatches}
          columns={[
            { key: "id", header: "Dispatch" },
            { key: "customer", header: "Distributor" },
            { key: "product", header: "Product" },
            { key: "qty", header: "Sent" },
            { key: "destination", header: "Location" },
            { key: "status", header: "Status", render: (r) => <StatusBadge status={r.status} /> },
            { key: "x", header: "", render: (r) => <Button size="sm" variant="outline" disabled={updateDispatch.isPending} onClick={() => handleConfirm(r.id)}>Confirm receipt</Button> },
          ]}
        />
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Scan delivery</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="customer">Distributor</Label>
              <Input id="customer" value={form.customer} onChange={(e) => setForm({ ...form, customer: e.target.value })} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="product">Product</Label>
              <Input id="product" value={form.product} onChange={(e) => setForm({ ...form, product: e.target.value })} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="qty">Sent</Label>
              <Input id="qty" type="number" value={form.qty} onChange={(e) => setForm({ ...form, qty: e.target.value })} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="destination">Location</Label>
              <Input id="destination" value={form.destination} onChange={(e) => setForm({ ...form, destination: e.target.value })} required />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={createDispatch.isPending}>{createDispatch.isPending ? "Saving…" : "Save"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
