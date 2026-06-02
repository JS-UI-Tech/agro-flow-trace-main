import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/DataTable";
import { StatusBadge } from "@/components/StatusBadge";
import { useDispatches } from "@/hooks/api";
import { QrCode } from "lucide-react";

export const Route = createFileRoute("/dispatch")({
  head: () => ({ meta: [{ title: "Dispatch — AgroTrace" }] }),
  component: DispatchPage,
});

function DispatchPage() {
  const { data: dispatches = [] } = useDispatches();
  return (
    <>
      <PageHeader title="Sales &amp; Dispatch" description="Pick FG lots, scan cartons and generate dispatch notes." actions={<Button>New sales order</Button>} />
      <div className="grid gap-4 p-6 lg:grid-cols-3">
        <div className="rounded-lg border border-border bg-card p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-foreground">Build dispatch</h3>
          <div className="mt-4 space-y-3 text-sm">
            <div><label className="text-xs text-muted-foreground">Customer</label><select className="mt-1 h-9 w-full rounded-md border border-input bg-card px-2"><option>Naivas Supermarkets</option><option>Carrefour Kenya</option></select></div>
            <div><label className="text-xs text-muted-foreground">Scan carton</label><div className="mt-1 flex gap-2"><input className="h-9 flex-1 rounded-md border border-input bg-card px-3" placeholder="QR / barcode" /><Button variant="outline" size="icon"><QrCode className="h-4 w-4" /></Button></div></div>
            <div className="grid grid-cols-2 gap-2">
              <div><label className="text-xs text-muted-foreground">Vehicle</label><input className="mt-1 h-9 w-full rounded-md border border-input bg-card px-3" placeholder="KCA 442X" /></div>
              <div><label className="text-xs text-muted-foreground">Driver</label><input className="mt-1 h-9 w-full rounded-md border border-input bg-card px-3" placeholder="Samuel N." /></div>
            </div>
            <div><label className="text-xs text-muted-foreground">Destination</label><input className="mt-1 h-9 w-full rounded-md border border-input bg-card px-3" placeholder="Nairobi DC" /></div>
            <Button className="w-full">Confirm shipment</Button>
          </div>
        </div>
        <div className="lg:col-span-2">
          <DataTable
            data={dispatches}
            columns={[
              { key: "id", header: "Dispatch" },
              { key: "customer", header: "Customer" },
              { key: "product", header: "Product" },
              { key: "qty", header: "Qty" },
              { key: "vehicle", header: "Vehicle" },
              { key: "driver", header: "Driver" },
              { key: "destination", header: "Destination" },
              { key: "status", header: "Status", render: (r) => <StatusBadge status={r.status} /> },
            ]}
          />
        </div>
      </div>
    </>
  );
}
