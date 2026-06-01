import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/DataTable";
import { StatusBadge } from "@/components/StatusBadge";
import { Plus } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { usePackagingState } from "@/lib/packaging-store";

export const Route = createFileRoute("/packaging")({
  head: () => ({ meta: [{ title: "Packaging — AgroTrace" }] }),
  component: PackagingPage,
});

function PackagingPage() {
  const { runs } = usePackagingState();
  const rows = runs.map((r) => ({
    id: r.id,
    batch: r.batch,
    product: r.product,
    packaging: r.packaging,
    packed: `${r.boxes.length} boxes · ${r.boxes.reduce((s, b) => s + b.products.length, 0)} units`,
    expiry: r.expiry,
    status: r.status,
  }));
  return (
    <>
      <PageHeader
        title="Packaging"
        description="Pack production batches into finished goods lots."
        actions={
          <Button asChild>
            <Link to="/packaging/new">
              <Plus className="mr-1 h-4 w-4" />Add new production run
            </Link>
          </Button>
        }
      />
      <div className="p-6">
        <DataTable
          data={rows}
          columns={[
            {
              key: "id",
              header: "Run",
              render: (r) => (
                <Link to="/packaging/run/$runId" params={{ runId: r.id }} className="font-medium text-primary hover:underline">
                  {r.id}
                </Link>
              ),
            },
            { key: "batch", header: "Batch" },
            { key: "product", header: "Product" },
            { key: "packaging", header: "Packaging" },
            { key: "packed", header: "Packed" },
            { key: "expiry", header: "Expiry" },
            { key: "status", header: "Status", render: (r) => <StatusBadge status={r.status} /> },
          ]}
        />
      </div>
    </>
  );
}
