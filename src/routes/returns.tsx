import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/DataTable";
import { returns } from "@/lib/mock-data";

export const Route = createFileRoute("/returns")({
  head: () => ({ meta: [{ title: "Returns — AgroTrace" }] }),
  component: ReturnsPage,
});

function ReturnsPage() {
  return (
    <>
      <PageHeader title="Returns Management" description="Capture and resolve customer returns." actions={<Button>Record return</Button>} />
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
          ]}
        />
      </div>
    </>
  );
}
