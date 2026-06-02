import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/DataTable";
import { StatusBadge } from "@/components/StatusBadge";
import { useFinishedGoods, useCreate, useUpdate, type FinishedGood } from "@/hooks/api";
import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/finished-goods")({
  head: () => ({ meta: [{ title: "Finished Goods — AgroTrace" }] }),
  component: FGPage,
});

function FGPage() {
  const { data: finishedGoods = [] } = useFinishedGoods();
  const createFinishedGood = useCreate("/api/finished-goods", "finished-goods");
  const updateFinishedGood = useUpdate("/api/finished-goods", "finished-goods");

  const [addOpen, setAddOpen] = useState(false);
  const [active, setActive] = useState<FinishedGood | null>(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<FinishedGood | null>(null);

  const openFg = (fg: FinishedGood) => {
    setActive(fg);
    setDraft({ ...fg });
    setEditing(false);
  };

  const closeFg = () => {
    setActive(null);
    setDraft(null);
    setEditing(false);
  };

  const updateDraft = <K extends keyof FinishedGood>(key: K, value: FinishedGood[K]) => {
    setDraft((d) => (d ? { ...d, [key]: value } : d));
  };

  const handleAdd = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const body = {
      product: String(data.get("product") ?? ""),
      batch: String(data.get("batch") ?? ""),
      qty: String(data.get("qty") ?? ""),
      location: String(data.get("location") ?? ""),
      mfg: String(data.get("mfg") ?? ""),
      expiry: String(data.get("expiry") ?? ""),
      status: String(data.get("status") ?? "Pending QC"),
    };
    createFinishedGood.mutate(body, {
      onSuccess: () => {
        toast.success("Finished good added", { description: `${body.product} created.` });
        setAddOpen(false);
      },
      onError: (err) => {
        toast.error("Failed to add finished good", { description: String(err) });
      },
    });
  };

  const handleSave = () => {
    if (!active || !draft) return;
    const { id, ...body } = draft;
    updateFinishedGood.mutate(
      { id, body },
      {
        onSuccess: () => {
          toast.success(`${draft.product} updated`);
          closeFg();
        },
        onError: (err) => {
          toast.error("Failed to update finished good", { description: String(err) });
        },
      },
    );
  };

  const handleRelease = (fg: FinishedGood) => {
    updateFinishedGood.mutate(
      { id: fg.id, body: { status: "Released" } },
      {
        onSuccess: () => {
          toast.success(`${fg.id} released`, { description: "QC release recorded." });
        },
        onError: (err) => {
          toast.error("Failed to release", { description: String(err) });
        },
      },
    );
  };

  return (
    <>
      <PageHeader
        title="Finished Goods"
        description="QC release and FEFO-ready inventory."
        actions={
          <>
            <Button variant="outline">Release queue</Button>
            <Button onClick={() => setAddOpen(true)}>Add finished good</Button>
          </>
        }
      />
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
            {
              key: "actions",
              header: "",
              render: (r) => (
                <div className="flex justify-end gap-1">
                  {r.status !== "Released" ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRelease(r)}
                      disabled={updateFinishedGood.isPending}
                    >
                      Release
                    </Button>
                  ) : null}
                  <Button variant="ghost" size="sm" onClick={() => openFg(r)}>
                    View
                  </Button>
                </div>
              ),
            },
          ]}
        />
      </div>

      <Sheet open={!!active} onOpenChange={(o) => !o && closeFg()}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
          {active && draft ? (
            <>
              <SheetHeader>
                <div className="flex items-center gap-2 pr-10">
                  <SheetTitle className="flex-1">{active.product}</SheetTitle>
                  {editing ? (
                    <Badge className="bg-primary/10 text-primary hover:bg-primary/10">Editing</Badge>
                  ) : null}
                </div>
                <SheetDescription>
                  {active.id} · From batch {active.batch}
                </SheetDescription>
              </SheetHeader>
              <div className="mt-6 space-y-6">
                <div className="flex flex-wrap gap-2">
                  <StatusBadge status={draft.status} />
                  <Badge variant="outline">Qty {draft.qty}</Badge>
                  <Badge variant="outline">Expiry {draft.expiry}</Badge>
                </div>
                <div>
                  <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Lot details
                  </h4>
                  {!editing ? (
                    <dl className="divide-y divide-border rounded-md border border-border">
                      {[
                        ["FG Lot", draft.id],
                        ["Product", draft.product],
                        ["From batch", draft.batch],
                        ["Qty", draft.qty],
                        ["Location", draft.location],
                        ["MFG", draft.mfg],
                        ["Expiry", draft.expiry],
                        ["Status", draft.status],
                      ].map(([k, v]) => (
                        <div key={k} className="grid grid-cols-2 gap-3 px-3 py-2 text-sm">
                          <dt className="text-muted-foreground">{k}</dt>
                          <dd className="font-medium text-foreground">{v}</dd>
                        </div>
                      ))}
                    </dl>
                  ) : (
                    <div className="space-y-3 rounded-md border border-border p-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground">Product</Label>
                        <Input value={draft.product} onChange={(e) => updateDraft("product", e.target.value)} />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <Label className="text-xs text-muted-foreground">From batch</Label>
                          <Input value={draft.batch} onChange={(e) => updateDraft("batch", e.target.value)} />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs text-muted-foreground">Qty</Label>
                          <Input value={draft.qty} onChange={(e) => updateDraft("qty", e.target.value)} />
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground">Location</Label>
                        <Input value={draft.location} onChange={(e) => updateDraft("location", e.target.value)} />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <Label className="text-xs text-muted-foreground">MFG</Label>
                          <Input value={draft.mfg} onChange={(e) => updateDraft("mfg", e.target.value)} />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs text-muted-foreground">Expiry</Label>
                          <Input value={draft.expiry} onChange={(e) => updateDraft("expiry", e.target.value)} />
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground">Status</Label>
                        <Select value={draft.status} onValueChange={(v) => updateDraft("status", v)}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Pending QC">Pending QC</SelectItem>
                            <SelectItem value="Released">Released</SelectItem>
                            <SelectItem value="Quarantined">Quarantined</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <SheetFooter className="mt-6 gap-2">
                {editing ? (
                  <>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setDraft({ ...active });
                        setEditing(false);
                      }}
                    >
                      Cancel edit
                    </Button>
                    <Button onClick={handleSave} disabled={updateFinishedGood.isPending}>
                      Save changes
                    </Button>
                  </>
                ) : (
                  <>
                    <Button variant="outline" onClick={closeFg}>
                      Close
                    </Button>
                    {active.status !== "Released" ? (
                      <Button
                        variant="outline"
                        onClick={() => handleRelease(active)}
                        disabled={updateFinishedGood.isPending}
                      >
                        QC release
                      </Button>
                    ) : null}
                    <Button onClick={() => setEditing(true)}>Edit</Button>
                  </>
                )}
              </SheetFooter>
            </>
          ) : null}
        </SheetContent>
      </Sheet>

      <Sheet open={addOpen} onOpenChange={setAddOpen}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>Add finished good</SheetTitle>
            <SheetDescription>
              Register a finished good lot. It enters the QC release queue on save.
            </SheetDescription>
          </SheetHeader>
          <form onSubmit={handleAdd} className="mt-6 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="product">Product</Label>
              <Input id="product" name="product" placeholder="e.g. Whole Milk 500ml" required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="batch">From batch</Label>
                <Input id="batch" name="batch" placeholder="BATCH-0042" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="qty">Qty</Label>
                <Input id="qty" name="qty" placeholder="1200 units" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <Input id="location" name="location" placeholder="Cold Store A" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="mfg">MFG date</Label>
                <Input id="mfg" name="mfg" type="date" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="expiry">Expiry date</Label>
                <Input id="expiry" name="expiry" type="date" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select name="status" defaultValue="Pending QC">
                <SelectTrigger id="status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Pending QC">Pending QC</SelectItem>
                  <SelectItem value="Released">Released</SelectItem>
                  <SelectItem value="Quarantined">Quarantined</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <SheetFooter className="gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setAddOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createFinishedGood.isPending}>
                Save finished good
              </Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>
    </>
  );
}
