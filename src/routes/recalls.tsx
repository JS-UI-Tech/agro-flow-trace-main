import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/DataTable";
import { StatusBadge } from "@/components/StatusBadge";
import { recalls } from "@/lib/mock-data";

export const Route = createFileRoute("/recalls")({
  head: () => ({ meta: [{ title: "Recall Management — AgroTrace" }] }),
  component: RecallsPage,
});

function RecallsPage() {
  return (
    <>
      <PageHeader title="Recall Management" description="Open recall cases, identify affected lots and track recovery." actions={<Button variant="destructive">Open new recall</Button>} />
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
          ]}
        />
      </div>
    </>
  );
}
