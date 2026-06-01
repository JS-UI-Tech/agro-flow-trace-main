import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/DataTable";
import { StatusBadge } from "@/components/StatusBadge";
import { dispatches } from "@/lib/mock-data";

export const Route = createFileRoute("/customer-receiving")({
  head: () => ({ meta: [{ title: "Customer Receiving — AgroTrace" }] }),
  component: ReceivingPage,
});

function ReceivingPage() {
  return (
    <>
      <PageHeader title="Customer / Distributor Receiving" description="Confirm deliveries, record short / damaged quantities." actions={<Button>Scan delivery</Button>} />
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
            { key: "x", header: "", render: () => <Button size="sm" variant="outline">Confirm receipt</Button> },
          ]}
        />
      </div>
    </>
  );
}
