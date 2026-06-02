import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/DataTable";
import { StatusBadge } from "@/components/StatusBadge";
import { useWasteRecords, useCreate, useUpdate, type WasteRecord } from "@/hooks/api";
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

export const Route = createFileRoute("/waste")({
  head: () => ({ meta: [{ title: "Waste & Loss — AgroTrace" }] }),
  component: WastePage,
});

function WastePage() {
  const { data: wasteRecords = [] } = useWasteRecords();
  const createWaste = useCreate<WasteRecord, Partial<WasteRecord>>("/api/waste-records", "waste-records");
  const updateWaste = useUpdate<WasteRecord, Partial<WasteRecord>>("/api/waste-records", "waste-records");
  const [addOpen, setAddOpen] = useState(false);

  const handleAdd = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const body: Partial<WasteRecord> = {
      source: String(data.get("source") ?? ""),
      material: String(data.get("material") ?? ""),
      qty: String(data.get("qty") ?? ""),
      reason: String(data.get("reason") ?? ""),
      disposal: String(data.get("disposal") ?? ""),
      date: String(data.get("date") ?? new Date().toISOString().slice(0, 10)),
      status: "Pending",
    };
    createWaste.mutate(body, {
      onSuccess: () => {
        toast.success("Waste recorded", { description: `${body.material} · ${body.qty}` });
        setAddOpen(false);
      },
      onError: (err) =>
        toast.error("Failed to record waste", { description: (err as Error).message }),
    });
  };

  const handleApprove = (r: WasteRecord) => {
    updateWaste.mutate(
      { id: r.id, body: { status: "Approved" } },
      {
        onSuccess: () => toast.success("Waste approved", { description: r.id }),
        onError: (err) =>
          toast.error("Failed to approve", { description: (err as Error).message }),
      },
    );
  };

  return (
    <>
      <PageHeader title="Waste &amp; Loss" description="Record losses with reason and disposal method." actions={<Button onClick={() => setAddOpen(true)}>Record waste</Button>} />
      <div className="p-6">
        <DataTable
          data={wasteRecords}
          columns={[
            { key: "id", header: "Record" },
            { key: "source", header: "Source" },
            { key: "material", header: "Material" },
            { key: "qty", header: "Quantity" },
            { key: "reason", header: "Reason" },
            { key: "disposal", header: "Disposal" },
            { key: "date", header: "Date" },
            { key: "status", header: "Status", render: (r) => <StatusBadge status={r.status} /> },
            {
              key: "actions",
              header: "",
              render: (r) =>
                r.status !== "Approved" ? (
                  <Button variant="ghost" size="sm" onClick={() => handleApprove(r)} disabled={updateWaste.isPending}>
                    Approve
                  </Button>
                ) : null,
            },
          ]}
        />
      </div>

      <Sheet open={addOpen} onOpenChange={setAddOpen}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>Record waste</SheetTitle>
            <SheetDescription>
              Log a loss with its source, reason and disposal method.
            </SheetDescription>
          </SheetHeader>
          <form onSubmit={handleAdd} className="mt-6 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="source">Source</Label>
                <Input id="source" name="source" placeholder="Production line A" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="material">Material</Label>
                <Input id="material" name="material" placeholder="Raw milk" required />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="qty">Quantity</Label>
              <Input id="qty" name="qty" placeholder="120 L" required />
            </div>

            <div className="space-y-2">
              <Label htmlFor="reason">Reason</Label>
              <Input id="reason" name="reason" placeholder="Spoilage" required />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="disposal">Disposal method</Label>
                <Select name="disposal" defaultValue="Incineration">
                  <SelectTrigger id="disposal">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Incineration">Incineration</SelectItem>
                    <SelectItem value="Landfill">Landfill</SelectItem>
                    <SelectItem value="Composting">Composting</SelectItem>
                    <SelectItem value="Animal feed">Animal feed</SelectItem>
                    <SelectItem value="Returned to supplier">Returned to supplier</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="date">Date</Label>
                <Input id="date" name="date" type="date" defaultValue={new Date().toISOString().slice(0, 10)} />
              </div>
            </div>

            <SheetFooter className="gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setAddOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createWaste.isPending}>
                {createWaste.isPending ? "Saving…" : "Save record"}
              </Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>
    </>
  );
}
