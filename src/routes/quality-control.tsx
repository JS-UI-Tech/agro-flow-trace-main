import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/DataTable";
import { StatusBadge } from "@/components/StatusBadge";
import { useQcChecks, useCreate } from "@/hooks/api";
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

export const Route = createFileRoute("/quality-control")({
  head: () => ({ meta: [{ title: "Quality Control — AgroTrace" }] }),
  component: QCPage,
});

function QCPage() {
  const { data: checks = [] } = useQcChecks();
  const createCheck = useCreate("/api/qc-checks", "qc-checks");
  const [addOpen, setAddOpen] = useState(false);

  const handleAdd = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const body = {
      batch: String(data.get("batch") ?? ""),
      checkpoint: String(data.get("checkpoint") ?? ""),
      value: String(data.get("value") ?? ""),
      limit: String(data.get("limit") ?? ""),
      inspector: String(data.get("inspector") ?? ""),
      time: new Date().toISOString(),
      status: String(data.get("status") ?? "Pass"),
    };
    createCheck.mutate(body, {
      onSuccess: () => {
        toast.success("Check recorded", {
          description: `${body.checkpoint} on ${body.batch}.`,
        });
        setAddOpen(false);
      },
      onError: (err) => {
        toast.error("Failed to record check", {
          description: err instanceof Error ? err.message : "Please try again.",
        });
      },
    });
  };

  return (
    <>
      <PageHeader
        title="Quality Control"
        description="Intake, in-process, and finished goods inspections."
        actions={<Button onClick={() => setAddOpen(true)}>Record check</Button>}
      />
      <div className="p-6">
        <DataTable
          data={checks}
          columns={[
            { key: "id", header: "Check" },
            { key: "batch", header: "Batch" },
            { key: "checkpoint", header: "Checkpoint" },
            { key: "value", header: "Value" },
            { key: "limit", header: "Limit" },
            { key: "inspector", header: "Inspector" },
            { key: "time", header: "Time" },
            { key: "status", header: "Status", render: (r) => <StatusBadge status={r.status} /> },
          ]}
        />
      </div>

      <Sheet open={addOpen} onOpenChange={setAddOpen}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>Record check</SheetTitle>
            <SheetDescription>
              Log a quality control inspection result. Time is captured on save.
            </SheetDescription>
          </SheetHeader>
          <form onSubmit={handleAdd} className="mt-6 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="batch">Batch</Label>
                <Input id="batch" name="batch" placeholder="BATCH-0094" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="checkpoint">Checkpoint</Label>
                <Input id="checkpoint" name="checkpoint" placeholder="Intake / In-process / FG" required />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="value">Value</Label>
                <Input id="value" name="value" placeholder="e.g. 4.2 pH" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="limit">Limit</Label>
                <Input id="limit" name="limit" placeholder="e.g. 4.0–4.6 pH" />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="inspector">Inspector</Label>
              <Input id="inspector" name="inspector" placeholder="J. Mwangi" required />
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select name="status" defaultValue="Pass">
                <SelectTrigger id="status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Pass">Pass</SelectItem>
                  <SelectItem value="Fail">Fail</SelectItem>
                  <SelectItem value="Pending">Pending</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <SheetFooter className="gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setAddOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createCheck.isPending}>
                Save check
              </Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>
    </>
  );
}
