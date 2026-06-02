import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/DataTable";
import { StatusBadge } from "@/components/StatusBadge";
import { useDispatches, useCreate, useUpdate } from "@/hooks/api";
import { toast } from "sonner";
import { QrCode } from "lucide-react";

export const Route = createFileRoute("/dispatch")({
  head: () => ({ meta: [{ title: "Dispatch — AgroTrace" }] }),
  component: DispatchPage,
});

type Dispatch = {
  id: string;
  customer: string;
  product: string;
  qty: string;
  vehicle: string;
  driver: string;
  destination: string;
  status: string;
};

function DispatchPage() {
  const { data: dispatches = [] } = useDispatches();
  const createDispatch = useCreate<Dispatch, Record<string, unknown>>("/api/dispatches", "dispatches");
  const updateDispatch = useUpdate<Dispatch, Record<string, unknown>>("/api/dispatches", "dispatches");

  const [customer, setCustomer] = useState("Naivas Supermarkets");
  const [carton, setCarton] = useState("");
  const [vehicle, setVehicle] = useState("");
  const [driver, setDriver] = useState("");
  const [destination, setDestination] = useState("");

  const handleConfirm = () => {
    createDispatch.mutate(
      {
        customer,
        carton,
        vehicle,
        driver,
        destination,
        status: "Dispatched",
        dispatchedAt: new Date().toISOString(),
      },
      {
        onSuccess: () => {
          toast.success("Shipment confirmed");
          setCarton("");
          setVehicle("");
          setDriver("");
          setDestination("");
        },
        onError: (e) => toast.error(e instanceof Error ? e.message : "Failed to confirm shipment"),
      },
    );
  };

  const handleStatusChange = (row: Dispatch, status: string) => {
    updateDispatch.mutate(
      { id: row.id, body: { status, updatedAt: new Date().toISOString() } },
      {
        onSuccess: () => toast.success("Status updated"),
        onError: (e) => toast.error(e instanceof Error ? e.message : "Failed to update status"),
      },
    );
  };

  return (
    <>
      <PageHeader title="Sales &amp; Dispatch" description="Pick FG lots, scan cartons and generate dispatch notes." actions={<Button onClick={handleConfirm} disabled={createDispatch.isPending}>New sales order</Button>} />
      <div className="grid gap-4 p-6 lg:grid-cols-3">
        <div className="rounded-lg border border-border bg-card p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-foreground">Build dispatch</h3>
          <div className="mt-4 space-y-3 text-sm">
            <div><label className="text-xs text-muted-foreground">Customer</label><select value={customer} onChange={(e) => setCustomer(e.target.value)} className="mt-1 h-9 w-full rounded-md border border-input bg-card px-2"><option>Naivas Supermarkets</option><option>Carrefour Kenya</option></select></div>
            <div><label className="text-xs text-muted-foreground">Scan carton</label><div className="mt-1 flex gap-2"><input value={carton} onChange={(e) => setCarton(e.target.value)} className="h-9 flex-1 rounded-md border border-input bg-card px-3" placeholder="QR / barcode" /><Button variant="outline" size="icon"><QrCode className="h-4 w-4" /></Button></div></div>
            <div className="grid grid-cols-2 gap-2">
              <div><label className="text-xs text-muted-foreground">Vehicle</label><input value={vehicle} onChange={(e) => setVehicle(e.target.value)} className="mt-1 h-9 w-full rounded-md border border-input bg-card px-3" placeholder="KCA 442X" /></div>
              <div><label className="text-xs text-muted-foreground">Driver</label><input value={driver} onChange={(e) => setDriver(e.target.value)} className="mt-1 h-9 w-full rounded-md border border-input bg-card px-3" placeholder="Samuel N." /></div>
            </div>
            <div><label className="text-xs text-muted-foreground">Destination</label><input value={destination} onChange={(e) => setDestination(e.target.value)} className="mt-1 h-9 w-full rounded-md border border-input bg-card px-3" placeholder="Nairobi DC" /></div>
            <Button className="w-full" onClick={handleConfirm} disabled={createDispatch.isPending}>Confirm shipment</Button>
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
              {
                key: "status",
                header: "Status",
                render: (r) => (
                  <button
                    type="button"
                    onClick={() => handleStatusChange(r as Dispatch, r.status === "Delivered" ? "Dispatched" : "Delivered")}
                    disabled={updateDispatch.isPending}
                    className="cursor-pointer"
                  >
                    <StatusBadge status={r.status} />
                  </button>
                ),
              },
            ]}
          />
        </div>
      </div>
    </>
  );
}
