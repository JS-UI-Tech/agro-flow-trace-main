import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft } from "lucide-react";
import { createRun } from "@/lib/packaging-store";
import { useBatchesState } from "@/lib/batches-store";

export const Route = createFileRoute("/packaging_/new")({
  head: () => ({ meta: [{ title: "New production run — AgroTrace" }] }),
  component: NewRunPage,
});

const PACKAGING_TYPES = [
  "PET 500ml + cap",
  "PET 1L + cap",
  "TetraPak 1L",
  "TetraPak 250ml",
  "Paper bag 2kg",
  "Carton 12 x 500ml",
];

function NewRunPage() {
  const navigate = useNavigate();
  const { active, completed } = useBatchesState();

  const batchOptions = [
    ...active.map((b) => ({ id: b.batchId, product: b.order.product })),
    ...completed.map((b) => ({ id: b.id, product: b.product })),
  ];

  const [batch, setBatch] = useState(batchOptions[0]?.id ?? "");
  const [packaging, setPackaging] = useState(PACKAGING_TYPES[0]);
  const [mfg, setMfg] = useState(new Date().toISOString().slice(0, 10));
  const [expiry, setExpiry] = useState("");
  const [boxCount, setBoxCount] = useState(10);
  const [productsPerBox, setProductsPerBox] = useState(12);

  const selectedProduct = batchOptions.find((b) => b.id === batch)?.product ?? "";

  function save() {
    if (!batch || !selectedProduct || !mfg || !expiry || boxCount < 1 || productsPerBox < 1) return;
    const run = createRun({
      batch,
      product: selectedProduct,
      packaging,
      mfg,
      expiry,
      boxCount,
      productsPerBox,
    });
    navigate({ to: "/packaging/run/$runId", params: { runId: run.id } });
  }

  const totalUnits = boxCount * productsPerBox;
  const canSave = !!batch && !!selectedProduct && !!mfg && !!expiry && boxCount >= 1 && productsPerBox >= 1;

  return (
    <>
      <PageHeader
        title="New production run"
        description="Tie a packaging run to a batch, define boxes and units per box."
        actions={
          <>
            <Button variant="outline" asChild>
              <Link to="/packaging">
                <ArrowLeft className="mr-1 h-4 w-4" /> Back
              </Link>
            </Button>
            <Button onClick={save} disabled={!canSave}>
              Create run & generate codes
            </Button>
          </>
        }
      />
      <div className="grid gap-6 p-6 lg:grid-cols-3">
        <div className="space-y-5 rounded-lg border border-border bg-card p-6 shadow-sm lg:col-span-2">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Production batch</Label>
              <Select value={batch} onValueChange={setBatch}>
                <SelectTrigger><SelectValue placeholder="Select batch" /></SelectTrigger>
                <SelectContent>
                  {batchOptions.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.id} — {b.product}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Packaging type</Label>
              <Select value={packaging} onValueChange={setPackaging}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PACKAGING_TYPES.map((p) => (
                    <SelectItem key={p} value={p}>{p}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>MFG date</Label>
              <Input type="date" value={mfg} onChange={(e) => setMfg(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Expiry date</Label>
              <Input type="date" value={expiry} onChange={(e) => setExpiry(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Number of boxes</Label>
              <Input type="number" min={1} value={boxCount} onChange={(e) => setBoxCount(parseInt(e.target.value) || 0)} />
            </div>
            <div className="space-y-2">
              <Label>Units per box</Label>
              <Input type="number" min={1} value={productsPerBox} onChange={(e) => setProductsPerBox(parseInt(e.target.value) || 0)} />
            </div>
          </div>
        </div>
        <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
          <h3 className="text-sm font-semibold text-foreground">Run summary</h3>
          <dl className="mt-4 space-y-3 text-sm">
            <div className="flex justify-between"><dt className="text-muted-foreground">Batch</dt><dd className="font-medium">{batch || "—"}</dd></div>
            <div className="flex justify-between"><dt className="text-muted-foreground">Product</dt><dd className="font-medium">{selectedProduct || "—"}</dd></div>
            <div className="flex justify-between"><dt className="text-muted-foreground">Boxes</dt><dd className="font-medium">{boxCount}</dd></div>
            <div className="flex justify-between"><dt className="text-muted-foreground">Units / box</dt><dd className="font-medium">{productsPerBox}</dd></div>
            <div className="flex justify-between border-t border-border pt-3"><dt className="text-muted-foreground">Total units</dt><dd className="font-semibold">{totalUnits.toLocaleString()}</dd></div>
          </dl>
          <p className="mt-4 text-xs text-muted-foreground">
            On save, a unique code & QR will be generated for the run, every box, and every individual unit.
          </p>
        </div>
      </div>
    </>
  );
}