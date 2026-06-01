import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/DataTable";
import { StatusBadge } from "@/components/StatusBadge";
import { finishedGoods } from "@/lib/mock-data";

export const Route = createFileRoute("/finished-goods")({
  head: () => ({ meta: [{ title: "Finished Goods — AgroTrace" }] }),
  component: FGPage,
});

function FGPage() {
  return (
    <>
      <PageHeader title="Finished Goods" description="QC release and FEFO-ready inventory." actions={<><Button variant="outline">Release queue</Button><Button>Run release check</Button></>} />
      <div className="p-6">
        <DataTable
          data={finishedGoods}
          columns={[
            { key: "id", header: "FG Lot" },
            { key: "product", header: "Product" },
            { key: "batch", header: "From batch" },
            { key: "qty", header: "Qty" },
            { key: "location", header: "Location" },
            { key: "mfg", header: "MFG" },
            { key: "expiry", header: "Expiry" },
            { key: "status", header: "Status", render: (r) => <StatusBadge status={r.status} /> },
          ]}
        />
      </div>
    </>
  );
}
