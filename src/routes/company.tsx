import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useCompanyConfig } from "@/hooks/api";
import { apiFetch } from "@/lib/api-client";
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
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export const Route = createFileRoute("/company")({
  head: () => ({ meta: [{ title: "Company Setup — AgroTrace" }] }),
  component: CompanySetup,
});

type Section = {
  title: string;
  desc: string;
  updated: string;
  owner: string;
  fields: { label: string; value: string }[];
  items?: string[];
};

const defaultSections: Section[] = [
  {
    title: "Company profile",
    desc: "Legal name, registration, VAT, contact details.",
    updated: "2026-05-12",
    owner: "P. Kimani (Plant Manager)",
    fields: [
      { label: "Legal name", value: "AgroTrace Processing Ltd" },
      { label: "Registration No.", value: "PVT-KE-2018-44219" },
      { label: "VAT / PIN", value: "P051298733M" },
      { label: "Head office", value: "Industrial Area, Nairobi, KE" },
      { label: "Primary contact", value: "+254 711 220 884" },
      { label: "Email", value: "ops@agrotrace.co.ke" },
    ],
  },
  {
    title: "Factory & site locations",
    desc: "Mwea Processing Plant, Eldoret Dairy, Nairobi DC.",
    updated: "2026-05-04",
    owner: "Ops Team",
    fields: [
      { label: "Total sites", value: "3" },
      { label: "Active production lines", value: "7" },
    ],
    items: [
      "Mwea Processing Plant — Kirinyaga (3 lines)",
      "Eldoret Dairy — Uasin Gishu (2 lines)",
      "Nairobi Distribution Centre — Industrial Area",
    ],
  },
  {
    title: "Stores, warehouses & cold rooms",
    desc: "12 locations registered.",
    updated: "2026-05-15",
    owner: "Stores Dept.",
    fields: [
      { label: "Ambient stores", value: "6" },
      { label: "Cold rooms", value: "4" },
      { label: "Quarantine bays", value: "2" },
    ],
    items: [
      "Cold Room A — 2 to 4°C",
      "Cold Room B — 0 to 2°C",
      "Silo 2 — Maize, 8,000 kg cap.",
      "Quarantine Store — Restricted access",
    ],
  },
  {
    title: "Departments",
    desc: "Production, QA, Stores, Sales, Maintenance.",
    updated: "2026-04-28",
    owner: "HR",
    fields: [{ label: "Departments", value: "5" }],
    items: ["Production", "Quality Assurance", "Stores & Logistics", "Sales", "Maintenance"],
  },
  {
    title: "Users & roles",
    desc: "47 users across 8 role profiles.",
    updated: "2026-05-18",
    owner: "IT Admin",
    fields: [
      { label: "Active users", value: "47" },
      { label: "Role profiles", value: "8" },
      { label: "Last access review", value: "2026-05-01" },
    ],
    items: [
      "Admin (2)",
      "Plant Manager (1)",
      "QA Manager (2)",
      "QA Officer (6)",
      "Production Supervisor (5)",
      "Stores Clerk (9)",
      "Operator (18)",
      "Viewer (4)",
    ],
  },
  {
    title: "Approval levels",
    desc: "QA Officer → QA Manager → Plant Manager.",
    updated: "2026-03-22",
    owner: "QA",
    fields: [
      { label: "Workflow steps", value: "3" },
      { label: "Escalation SLA", value: "4 hours" },
    ],
    items: [
      "L1 — QA Officer (raw material release)",
      "L2 — QA Manager (batch release, deviations)",
      "L3 — Plant Manager (recalls, write-offs)",
    ],
  },
  {
    title: "Product categories",
    desc: "Beverages, Dairy, Cereals, Snacks.",
    updated: "2026-02-10",
    owner: "Product",
    fields: [{ label: "Categories", value: "4" }, { label: "SKUs", value: "38" }],
    items: ["Beverages (12 SKUs)", "Dairy (9 SKUs)", "Cereals (11 SKUs)", "Snacks (6 SKUs)"],
  },
  {
    title: "Batch numbering rules",
    desc: "PB-{YYYY}-{####} auto-incremented per line.",
    updated: "2026-01-08",
    owner: "Production",
    fields: [
      { label: "Pattern", value: "PB-{YYYY}-{####}" },
      { label: "Reset cycle", value: "Yearly" },
      { label: "Per line counter", value: "Yes" },
    ],
  },
  {
    title: "Label formats",
    desc: "GS1-128, QR with traceability URL, internal RM tag.",
    updated: "2026-04-02",
    owner: "Packaging",
    fields: [
      { label: "Standards", value: "GS1-128, QR" },
      { label: "QR base URL", value: "verify.agrotrace.co.ke" },
    ],
    items: ["Finished goods — GS1-128 + QR", "Raw materials — internal RM tag", "Pallet — SSCC"],
  },
];

function CompanySetup() {
  const queryClient = useQueryClient();
  const { data: cfg } = useCompanyConfig();
  const [sections, setSections] = useState<Section[]>([]);
  const [active, setActive] = useState<Section | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Section | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const loaded = (cfg?.sections as Section[] | undefined) ?? [];
    setSections(loaded.length > 0 ? loaded : defaultSections);
  }, [cfg]);

  const persistSections = async (next: Section[]) => {
    setSaving(true);
    try {
      await apiFetch("/api/company-config", {
        method: "PUT",
        body: JSON.stringify({ sections: next }),
      });
      queryClient.invalidateQueries({ queryKey: ["company-config"] });
      return true;
    } catch {
      toast.error("Failed to save configuration");
      return false;
    } finally {
      setSaving(false);
    }
  };

  const openSheet = (s: Section, mode: "view" | "edit") => {
    setActive(s);
    setDraft(JSON.parse(JSON.stringify(s)) as Section);
    setEditing(mode === "edit");
  };

  const closeSheet = () => {
    setActive(null);
    setDraft(null);
    setEditing(false);
  };

  const handleAdd = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const name = String(data.get("name") ?? "");
    const type = String(data.get("type") ?? "");
    const owner = String(data.get("owner") ?? "");
    const code = String(data.get("code") ?? "");
    const status = String(data.get("status") ?? "");
    const effective = String(data.get("effective") ?? "");
    const notes = String(data.get("notes") ?? "");

    const newSection: Section = {
      title: name,
      desc: notes || type,
      updated: effective,
      owner,
      fields: [
        { label: "Type", value: type },
        { label: "Reference code", value: code },
        { label: "Status", value: status },
      ],
    };

    const next = [...sections, newSection];
    setSections(next);
    const ok = await persistSections(next);
    if (ok) {
      toast.success(`Configuration added`, {
        description: `${name} (${type}) saved.`,
      });
    }
    setAddOpen(false);
  };

  return (
    <>
      <PageHeader
        title="Company Setup"
        description="Configure the structure of your organization, sites, and operating rules."
        actions={<Button onClick={() => setAddOpen(true)}>Add configuration</Button>}
      />
      <div className="grid gap-4 p-6 md:grid-cols-2 lg:grid-cols-3">
        {sections.map((s) => (
          <button
            key={s.title}
            type="button"
            onClick={() => openSheet(s, "view")}
            className="rounded-lg border border-border bg-card p-5 text-left shadow-sm transition-colors hover:border-primary/40 hover:bg-accent/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <h3 className="text-sm font-semibold text-foreground">{s.title}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{s.desc}</p>
            <p className="mt-4 text-xs font-medium text-primary">View details →</p>
          </button>
        ))}
      </div>

      <Sheet open={!!active} onOpenChange={(o) => !o && closeSheet()}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
          {active && draft ? (
            <>
              <SheetHeader>
                <div className="flex items-center gap-2 pr-10">
                  <SheetTitle className="flex-1">{active.title}</SheetTitle>
                  {editing ? (
                    <Badge className="bg-primary/10 text-primary hover:bg-primary/10">
                      Editing
                    </Badge>
                  ) : null}
                </div>
                <SheetDescription>{active.desc}</SheetDescription>
              </SheetHeader>
              <div className="mt-6 space-y-6">
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary">Owner: {draft.owner}</Badge>
                  <Badge variant="outline">Updated {draft.updated}</Badge>
                </div>

                <div>
                  <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Details
                  </h4>
                  {!editing ? (
                    <dl className="divide-y divide-border rounded-md border border-border">
                      {draft.fields.map((f) => (
                        <div
                          key={f.label}
                          className="grid grid-cols-2 gap-3 px-3 py-2 text-sm"
                        >
                          <dt className="text-muted-foreground">{f.label}</dt>
                          <dd className="font-medium text-foreground">{f.value}</dd>
                        </div>
                      ))}
                    </dl>
                  ) : (
                    <div className="space-y-3 rounded-md border border-border p-3">
                      {draft.fields.map((f, i) => (
                        <div key={f.label} className="space-y-1.5">
                          <Label className="text-xs text-muted-foreground">{f.label}</Label>
                          <Input
                            value={f.value}
                            onChange={(e) => {
                              const next = { ...draft, fields: [...draft.fields] };
                              next.fields[i] = { ...f, value: e.target.value };
                              setDraft(next);
                            }}
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {draft.items ? (
                  <div>
                    <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Entries
                    </h4>
                    {!editing ? (
                      <ul className="space-y-1.5 rounded-md border border-border p-3 text-sm">
                        {draft.items.map((it) => (
                          <li key={it} className="flex items-start gap-2">
                            <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary" />
                            <span className="text-foreground">{it}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <div className="space-y-2 rounded-md border border-border p-3">
                        {draft.items.map((it, i) => (
                          <div key={i} className="flex gap-2">
                            <Input
                              value={it}
                              onChange={(e) => {
                                const items = [...(draft.items ?? [])];
                                items[i] = e.target.value;
                                setDraft({ ...draft, items });
                              }}
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                const items = (draft.items ?? []).filter((_, idx) => idx !== i);
                                setDraft({ ...draft, items });
                              }}
                            >
                              Remove
                            </Button>
                          </div>
                        ))}
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            setDraft({ ...draft, items: [...(draft.items ?? []), ""] })
                          }
                        >
                          Add entry
                        </Button>
                      </div>
                    )}
                  </div>
                ) : null}
              </div>
              <SheetFooter className="mt-6 gap-2">
                {editing ? (
                  <>
                    <Button variant="outline" onClick={() => setEditing(false)}>
                      Cancel edit
                    </Button>
                    <Button
                      disabled={saving}
                      onClick={async () => {
                        if (!draft) return;
                        const next = sections.map((s) =>
                          s.title === active.title ? draft : s,
                        );
                        setSections(next);
                        const ok = await persistSections(next);
                        if (ok) {
                          toast.success(`${active.title} updated`);
                          closeSheet();
                        }
                      }}
                    >
                      {saving ? "Saving…" : "Save changes"}
                    </Button>
                  </>
                ) : (
                  <>
                    <Button variant="outline" onClick={closeSheet}>
                      Close
                    </Button>
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
            <SheetTitle>Add configuration</SheetTitle>
            <SheetDescription>
              Register a new site, department, role, or operating rule.
            </SheetDescription>
          </SheetHeader>
          <form onSubmit={handleAdd} className="mt-6 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="type">Configuration type</Label>
              <Select name="type" defaultValue="Site location">
                <SelectTrigger id="type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Site location">Site location</SelectItem>
                  <SelectItem value="Store / warehouse">Store / warehouse</SelectItem>
                  <SelectItem value="Department">Department</SelectItem>
                  <SelectItem value="Role profile">Role profile</SelectItem>
                  <SelectItem value="Approval level">Approval level</SelectItem>
                  <SelectItem value="Product category">Product category</SelectItem>
                  <SelectItem value="Batch numbering rule">Batch numbering rule</SelectItem>
                  <SelectItem value="Label format">Label format</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" name="name" placeholder="e.g. Kisumu Cold Store" required />
            </div>

            <div className="space-y-2">
              <Label htmlFor="code">Reference code</Label>
              <Input id="code" name="code" placeholder="e.g. STR-KSM-01" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="owner">Owner / responsible</Label>
              <Select name="owner" defaultValue="P. Kimani">
                <SelectTrigger id="owner">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="P. Kimani">P. Kimani (Plant Manager)</SelectItem>
                  <SelectItem value="J. Otieno">J. Otieno (Production)</SelectItem>
                  <SelectItem value="L. Mutua">L. Mutua (QA)</SelectItem>
                  <SelectItem value="M. Wanjiku">M. Wanjiku (Stores)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="effective">Effective date</Label>
                <Input id="effective" name="effective" type="date" defaultValue="2026-05-20" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select name="status" defaultValue="Active">
                  <SelectTrigger id="status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Active">Active</SelectItem>
                    <SelectItem value="Draft">Draft</SelectItem>
                    <SelectItem value="Pending approval">Pending approval</SelectItem>
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
                placeholder="Additional context, approval references, etc."
              />
            </div>

            <SheetFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setAddOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? "Saving…" : "Save configuration"}
              </Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>
    </>
  );
}
