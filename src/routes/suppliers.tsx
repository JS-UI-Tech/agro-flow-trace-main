import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/DataTable";
import { StatusBadge } from "@/components/StatusBadge";
import { useSuppliers, type Supplier } from "@/hooks/api";
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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/suppliers")({
  head: () => ({ meta: [{ title: "Suppliers — AgroTrace" }] }),
  component: SuppliersPage,
});

function SuppliersPage() {
  const { data: suppliers = [] } = useSuppliers();
  const [addOpen, setAddOpen] = useState(false);
  const [active, setActive] = useState<Supplier | null>(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Supplier | null>(null);

  const openSupplier = (s: Supplier) => {
    setActive(s);
    setDraft({ ...s });
    setEditing(false);
  };

  const closeSupplier = () => {
    setActive(null);
    setDraft(null);
    setEditing(false);
  };

  const updateDraft = <K extends keyof Supplier>(key: K, value: Supplier[K]) => {
    setDraft((d) => (d ? { ...d, [key]: value } : d));
  };

  const handleExport = () => {
    const headers = ["name", "location", "materials", "status", "risk", "cert", "rejection"];
    const rows = suppliers.map((s) =>
      headers.map((h) => `"${String((s as Record<string, unknown>)[h] ?? "")}"`).join(","),
    );
    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `suppliers-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Suppliers exported", { description: `${suppliers.length} records as CSV.` });
  };

  const handleAdd = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    toast.success("Supplier added", {
      description: `${data.get("name")} pending QA approval.`,
    });
    setAddOpen(false);
  };

  return (
    <>
      <PageHeader
        title="Suppliers"
        description="Approved supplier base, performance and certifications."
        actions={
          <>
            <Button variant="outline" onClick={handleExport}>
              Export CSV
            </Button>
            <Button onClick={() => setAddOpen(true)}>Add Supplier</Button>
          </>
        }
      />
      <div className="space-y-4 p-6">
        <div className="flex flex-wrap gap-2">
          <input className="h-9 w-64 rounded-md border border-input bg-card px-3 text-sm" placeholder="Search suppliers…" />
          <select className="h-9 rounded-md border border-input bg-card px-2 text-sm">
            <option>All statuses</option><option>Approved</option><option>Pending</option><option>Quarantined</option>
          </select>
          <select className="h-9 rounded-md border border-input bg-card px-2 text-sm">
            <option>All risk</option><option>Low</option><option>Medium</option><option>High</option>
          </select>
        </div>
        <DataTable
          data={suppliers}
          columns={[
            { key: "name", header: "Supplier" },
            { key: "location", header: "Location" },
            { key: "materials", header: "Materials" },
            { key: "status", header: "Approval", render: (r) => <StatusBadge status={r.status} /> },
            { key: "risk", header: "Risk", render: (r) => <StatusBadge status={r.risk} /> },
            { key: "cert", header: "Certification", render: (r) => <StatusBadge status={r.cert} /> },
            { key: "rejection", header: "Rejection rate" },
            { key: "actions", header: "", render: (r) => <Button variant="ghost" size="sm" onClick={() => openSupplier(r)}>View</Button> },
          ]}
        />
      </div>

      <Sheet open={!!active} onOpenChange={(o) => !o && closeSupplier()}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
          {active && draft ? (
            <>
              <SheetHeader>
                <div className="flex items-center gap-2 pr-10">
                  <SheetTitle className="flex-1">{active.name}</SheetTitle>
                  {editing ? (
                    <Badge className="bg-primary/10 text-primary hover:bg-primary/10">Editing</Badge>
                  ) : null}
                </div>
                <SheetDescription>{active.id} · {active.location}</SheetDescription>
              </SheetHeader>
              <div className="mt-6 space-y-6">
                <div className="flex flex-wrap gap-2">
                  <StatusBadge status={draft.status} />
                  <StatusBadge status={draft.risk} />
                  <StatusBadge status={draft.cert} />
                  <Badge variant="outline">Rejection {draft.rejection}</Badge>
                </div>
                <div>
                  <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Profile</h4>
                  {!editing ? (
                    <dl className="divide-y divide-border rounded-md border border-border">
                      {[
                        ["Supplier ID", draft.id],
                        ["Name", draft.name],
                        ["Location", draft.location],
                        ["Materials", draft.materials],
                        ["Approval", draft.status],
                        ["Risk", draft.risk],
                        ["Certification", draft.cert],
                        ["Rejection rate", draft.rejection],
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
                        <Label className="text-xs text-muted-foreground">Name</Label>
                        <Input value={draft.name} onChange={(e) => updateDraft("name", e.target.value)} />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground">Location</Label>
                        <Input value={draft.location} onChange={(e) => updateDraft("location", e.target.value)} />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground">Materials</Label>
                        <Input value={draft.materials} onChange={(e) => updateDraft("materials", e.target.value)} />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <Label className="text-xs text-muted-foreground">Approval</Label>
                          <Select value={draft.status} onValueChange={(v) => updateDraft("status", v)}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Approved">Approved</SelectItem>
                              <SelectItem value="Pending">Pending</SelectItem>
                              <SelectItem value="Quarantined">Quarantined</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs text-muted-foreground">Risk</Label>
                          <Select value={draft.risk} onValueChange={(v) => updateDraft("risk", v)}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Low">Low</SelectItem>
                              <SelectItem value="Medium">Medium</SelectItem>
                              <SelectItem value="High">High</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <Label className="text-xs text-muted-foreground">Certification</Label>
                          <Select value={draft.cert} onValueChange={(v) => updateDraft("cert", v)}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Valid">Valid</SelectItem>
                              <SelectItem value="Expiring">Expiring</SelectItem>
                              <SelectItem value="Expired">Expired</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs text-muted-foreground">Rejection rate</Label>
                          <Input value={draft.rejection} onChange={(e) => updateDraft("rejection", e.target.value)} />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                <div>
                  <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Recent activity</h4>
                  <ul className="space-y-1.5 rounded-md border border-border p-3 text-sm">
                    <li className="flex items-start gap-2"><span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary" /><span>Last delivery received 2026-05-19 · Lot accepted</span></li>
                    <li className="flex items-start gap-2"><span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary" /><span>Certification audit completed 2026-04-12</span></li>
                    <li className="flex items-start gap-2"><span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary" /><span>Approval reviewed by QA Manager 2026-03-30</span></li>
                  </ul>
                </div>
              </div>
              <SheetFooter className="mt-6 gap-2">
                {editing ? (
                  <>
                    <Button variant="outline" onClick={() => { setDraft({ ...active }); setEditing(false); }}>Cancel edit</Button>
                    <Button onClick={() => { toast.success(`${draft.name} updated`); closeSupplier(); }}>Save changes</Button>
                  </>
                ) : (
                  <>
                    <Button variant="outline" onClick={closeSupplier}>Close</Button>
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
            <SheetTitle>Add supplier</SheetTitle>
            <SheetDescription>
              Register a new supplier. They will enter QA approval workflow on save.
            </SheetDescription>
          </SheetHeader>
          <form onSubmit={handleAdd} className="mt-6 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Supplier name</Label>
              <Input id="name" name="name" placeholder="e.g. Rift Valley Dairies Ltd" required />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="code">Supplier code</Label>
                <Input id="code" name="code" placeholder="SUP-0094" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="location">Location</Label>
                <Input id="location" name="location" placeholder="Nakuru, KE" />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="materials">Materials supplied</Label>
              <Input
                id="materials"
                name="materials"
                placeholder="Raw milk, Cream"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="contact">Primary contact</Label>
                <Input id="contact" name="contact" placeholder="J. Mwangi" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input id="phone" name="phone" placeholder="+254 722 100 200" />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" placeholder="ops@supplier.co.ke" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="cert">Certification</Label>
                <Select name="cert" defaultValue="ISO 22000">
                  <SelectTrigger id="cert">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ISO 22000">ISO 22000</SelectItem>
                    <SelectItem value="HACCP">HACCP</SelectItem>
                    <SelectItem value="GlobalG.A.P.">GlobalG.A.P.</SelectItem>
                    <SelectItem value="Organic">Organic</SelectItem>
                    <SelectItem value="None">None</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="risk">Risk rating</Label>
                <Select name="risk" defaultValue="Low">
                  <SelectTrigger id="risk">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Low">Low</SelectItem>
                    <SelectItem value="Medium">Medium</SelectItem>
                    <SelectItem value="High">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="onboarded">Onboarded date</Label>
                <Input id="onboarded" name="onboarded" type="date" defaultValue="2026-05-20" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">Approval status</Label>
                <Select name="status" defaultValue="Pending">
                  <SelectTrigger id="status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Pending">Pending</SelectItem>
                    <SelectItem value="Approved">Approved</SelectItem>
                    <SelectItem value="Quarantined">Quarantined</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                name="notes"
                rows={3}
                placeholder="Audit references, payment terms, etc."
              />
            </div>

            <SheetFooter className="gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setAddOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">Save supplier</Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>
    </>
  );
}
