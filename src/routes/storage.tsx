import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/DataTable";
import { StatusBadge } from "@/components/StatusBadge";
import { useRawMaterials } from "@/hooks/api";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { QrCode } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/storage")({
  head: () => ({ meta: [{ title: "Storage — AgroTrace" }] }),
  component: StoragePage,
});

function StoragePage() {
  const { data: rawMaterials = [] } = useRawMaterials();
  const [intakeOpen, setIntakeOpen] = useState(false);

  const handleIntake = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    toast.success(`Received ${data.get("qty") || "0"} ${data.get("uom") || ""} of ${data.get("material") || "material"}`);
    setIntakeOpen(false);
  };

  return (
    <>
      <PageHeader
        title="Storage & Stock"
        description="Live stock balance across stores, cold rooms and silos."
        actions={
          <>
            <Button variant="outline">Stock movement</Button>
            <Button onClick={() => setIntakeOpen(true)}>Receive raw material</Button>
          </>
        }
      />
      <div className="space-y-4 p-6">
        <div className="grid gap-4 sm:grid-cols-4">
          {[
            { name: "Cold Room A", temp: "4.2 °C", hum: "78%", items: 14 },
            { name: "Silo 2", temp: "22 °C", hum: "45%", items: 3 },
            { name: "Packaging Store", temp: "24 °C", hum: "50%", items: 28 },
            { name: "Quarantine", temp: "18 °C", hum: "55%", items: 2 },
          ].map((s) => (
            <div key={s.name} className="rounded-lg border border-border bg-card p-4 shadow-sm">
              <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{s.name}</div>
              <div className="mt-2 text-lg font-semibold">{s.items} lots</div>
              <div className="mt-1 text-xs text-muted-foreground">{s.temp} • {s.hum} RH</div>
            </div>
          ))}
        </div>
        <DataTable
          data={rawMaterials}
          columns={[
            { key: "id", header: "Batch ID" },
            { key: "material", header: "Material" },
            { key: "location", header: "Location" },
            { key: "qty", header: "Quantity" },
            { key: "expiry", header: "Expiry" },
            { key: "status", header: "Status", render: (r) => <StatusBadge status={r.status} /> },
          ]}
        />
      </div>

      <Sheet open={intakeOpen} onOpenChange={setIntakeOpen}>
        <SheetContent side="right" className="w-full sm:max-w-lg flex flex-col p-0">
          <SheetHeader className="px-6 pt-6 pb-2">
            <SheetTitle>Receive raw material</SheetTitle>
            <SheetDescription>
              Record an incoming delivery against a supplier note and assign it to a storage location.
            </SheetDescription>
          </SheetHeader>
          <form id="intake-form" onSubmit={handleIntake} className="flex-1 overflow-y-auto px-6 py-4">
            <div className="space-y-5">
              <Section title="Delivery info">
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Supplier">
                    <select name="supplier" className="input">
                      <option>Sunrise Dairy Coop</option>
                      <option>Green Valley Farms</option>
                      <option>Coast Fruits Ltd</option>
                      <option>PackRight Industries</option>
                    </select>
                  </Field>
                  <Field label="Delivery note #">
                    <input name="note" className="input" placeholder="DN-2026-0019" />
                  </Field>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Raw material">
                    <select name="material" className="input">
                      <option>Raw Milk</option>
                      <option>Maize Grain</option>
                      <option>Mango Pulp</option>
                      <option>Sugar</option>
                      <option>PET Bottles 500ml</option>
                    </select>
                  </Field>
                  <Field label="Supplier lot #">
                    <input name="lot" className="input" placeholder="SDC-9921" />
                  </Field>
                </div>
              </Section>

              <Section title="Quantity & dates">
                <div className="grid grid-cols-3 gap-3">
                  <Field label="Qty received">
                    <input name="qty" className="input" placeholder="2,400" />
                  </Field>
                  <Field label="UoM">
                    <select name="uom" className="input">
                      <option>L</option>
                      <option>kg</option>
                      <option>pcs</option>
                    </select>
                  </Field>
                  <Field label="Temp on arrival">
                    <input name="temp" className="input" placeholder="4.2 °C" />
                  </Field>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Harvest date">
                    <input name="harvest" className="input" type="date" />
                  </Field>
                  <Field label="Expiry date">
                    <input name="expiry" className="input" type="date" />
                  </Field>
                </div>
              </Section>

              <Section title="Logistics">
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Vehicle reg">
                    <input name="vehicle" className="input" placeholder="KCA 442X" />
                  </Field>
                  <Field label="Driver name">
                    <input name="driver" className="input" placeholder="Samuel N." />
                  </Field>
                </div>
              </Section>

              <Section title="Storage & traceability">
                <Field label="Assign to location">
                  <select name="location" className="input">
                    <option>Cold Room A</option>
                    <option>Silo 2</option>
                    <option>Packaging Store</option>
                    <option>Quarantine</option>
                  </select>
                </Field>
                <Field label="Scan label">
                  <div className="flex gap-2">
                    <input name="scan" className="input flex-1" placeholder="QR / barcode" />
                    <Button type="button" variant="outline" size="icon" className="shrink-1">
                      <QrCode className="h-4 w-4" />
                    </Button>
                  </div>
                </Field>
              </Section>
            </div>
          </form>
          <SheetFooter className="px-6 py-4 border-t gap-2 shrink-1">
            <Button type="button" variant="outline" onClick={() => setIntakeOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" form="intake-form">
              Accept delivery
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold text-foreground">{label}</span>
      {children}
    </label>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border bg-card/50 p-4 space-y-3">
      <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{title}</h4>
      {children}
    </div>
  );
}
