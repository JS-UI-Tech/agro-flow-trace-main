import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/DataTable";
import { StatusBadge } from "@/components/StatusBadge";
import { wasteRecords } from "@/lib/mock-data";

export const Route = createFileRoute("/waste")({
  head: () => ({ meta: [{ title: "Waste & Loss — AgroTrace" }] }),
  component: WastePage,
});

function WastePage() {
  return (
    <>
      <PageHeader title="Waste &amp; Loss" description="Record losses with reason and disposal method." actions={<Button>Record waste</Button>} />
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
          ]}
        />
      </div>
    </>
  );
}
