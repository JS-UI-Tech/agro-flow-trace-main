import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { STEP_LIBRARY, type WorkflowStepKey } from "@/lib/workflows";
import {
  useWorkflowInstances,
  useWorkflowTemplates,
  useUpdate,
  type WorkflowInstance,
  type WorkflowTemplate,
} from "@/hooks/api";
import {
  CheckCircle2,
  Circle,
  ChevronRight,
  Play,
  Workflow as WorkflowIcon,
  Clock,
} from "lucide-react";
import { toast } from "sonner";

type WorkflowStatus = "queued" | "in-progress" | "completed";

export const Route = createFileRoute("/workflows")({
  head: () => ({ meta: [{ title: "My Tasks — AgroTrace" }] }),
  component: WorkflowsPage,
});

function WorkflowsPage() {
  const instancesQuery = useWorkflowInstances();
  const templatesQuery = useWorkflowTemplates();
  const updateInstance = useUpdate<WorkflowInstance>(
    "/api/workflow-instances",
    "workflow-instances",
  );
  const [activeId, setActiveId] = useState<string | null>(null);
  const [formValues, setFormValues] = useState<Record<string, string>>({});

  const items = instancesQuery.data ?? [];
  const templates = templatesQuery.data ?? [];

  const templateById = (id: string): WorkflowTemplate | undefined =>
    templates.find((t) => t.id === id);

  const inProgress = items.filter((i) => i.assignee === "You" && i.status === "in-progress");
  const myQueued = items.filter((i) => i.assignee === "You" && i.status === "queued");
  const available = items.filter((i) => i.assignee === "Unassigned" && i.status === "queued");
  const history = items.filter(
    (i) => i.status === "completed" || (i.assignee !== "You" && i.assignee !== "Unassigned"),
  );
  const active = items.find((i) => i.id === activeId) ?? null;
  const activeTemplate = active ? templateById(active.templateId) : undefined;
  const activeSteps = (activeTemplate?.steps ?? []) as WorkflowStepKey[];

  const claim = (id: string) => {
    updateInstance.mutate(
      { id, body: { status: "in-progress", assignee: "You" } },
      { onSuccess: () => toast.success("Workflow claimed") },
    );
    setActiveId(id);
    setFormValues({});
  };

  const open = (id: string) => {
    setActiveId(id);
    setFormValues({});
  };

  const advance = () => {
    if (!active || !activeTemplate) return;
    const next = active.currentStep + 1;
    if (next >= activeSteps.length) {
      updateInstance.mutate(
        { id: active.id, body: { status: "completed", currentStep: next } },
        { onSuccess: () => toast.success(`Workflow ${active.id} completed`) },
      );
      setActiveId(null);
    } else {
      updateInstance.mutate(
        { id: active.id, body: { currentStep: next } },
        { onSuccess: () => toast.success("Step saved") },
      );
      setFormValues({});
    }
  };

  return (
    <>
      <PageHeader
        title="My Tasks"
        description="Pick up where you left off, start tasks assigned to you, or claim something new from the queue."
      />
      <div className="space-y-6 p-6">
        <section className="space-y-3">
          <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            <WorkflowIcon className="h-4 w-4" /> In progress
          </h2>
          {inProgress.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
              You have no tasks in progress. Start one assigned to you or claim a new one below.
            </div>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {inProgress.map((wf) => (
                <WorkflowCard
                  key={wf.id}
                  wf={wf}
                  template={templateById(wf.templateId)}
                  onOpen={() => open(wf.id)}
                  cta="Resume"
                />
              ))}
            </div>
          )}
        </section>

        <section className="space-y-3">
          <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            <WorkflowIcon className="h-4 w-4" /> Assigned to me
          </h2>
          {myQueued.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
              Nothing waiting for you right now.
            </div>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {myQueued.map((wf) => (
                <WorkflowCard
                  key={wf.id}
                  wf={wf}
                  template={templateById(wf.templateId)}
                  onOpen={() => open(wf.id)}
                  cta="Start task"
                />
              ))}
            </div>
          )}
        </section>

        <section className="space-y-3">
          <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            <Clock className="h-4 w-4" /> Available to claim
          </h2>
          <div className="overflow-hidden rounded-lg border border-border bg-card">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-4 py-2 text-left">Task</th>
                  <th className="px-4 py-2 text-left">Reference</th>
                  <th className="px-4 py-2 text-left">Created</th>
                  <th className="px-4 py-2 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {available.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-6 text-center text-sm text-muted-foreground">
                      No unassigned tasks in the queue.
                    </td>
                  </tr>
                ) : null}
                {available.map((wf) => {
                  const t = templateById(wf.templateId);
                  return (
                    <tr key={wf.id} className="border-t border-border">
                      <td className="px-4 py-2">
                        <div className="font-medium">{t?.name ?? "—"}</div>
                        <div className="text-xs text-muted-foreground">{wf.id}</div>
                      </td>
                      <td className="px-4 py-2 text-muted-foreground">{wf.reference}</td>
                      <td className="px-4 py-2 text-muted-foreground">
                        {(wf as { createdAt?: string }).createdAt ?? "—"}
                      </td>
                      <td className="px-4 py-2 text-right">
                        <Button size="sm" onClick={() => claim(wf.id)}>
                          Claim
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            <Clock className="h-4 w-4" /> History
          </h2>
          <div className="overflow-hidden rounded-lg border border-border bg-card">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-4 py-2 text-left">Task</th>
                  <th className="px-4 py-2 text-left">Reference</th>
                  <th className="px-4 py-2 text-left">Assignee</th>
                  <th className="px-4 py-2 text-left">Status</th>
                  <th className="px-4 py-2 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {history.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-6 text-center text-sm text-muted-foreground">
                      Nothing here yet.
                    </td>
                  </tr>
                ) : null}
                {history.map((wf) => {
                  const t = templateById(wf.templateId);
                  return (
                    <tr key={wf.id} className="border-t border-border">
                      <td className="px-4 py-2">
                        <div className="font-medium">{t?.name ?? "—"}</div>
                        <div className="text-xs text-muted-foreground">{wf.id}</div>
                      </td>
                      <td className="px-4 py-2 text-muted-foreground">{wf.reference}</td>
                      <td className="px-4 py-2 text-muted-foreground">{wf.assignee}</td>
                      <td className="px-4 py-2">
                        <StatusPill status={wf.status} />
                      </td>
                      <td className="px-4 py-2 text-right">
                        <Button size="sm" variant="outline" onClick={() => open(wf.id)}>
                          View
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <Sheet open={!!activeId} onOpenChange={(o) => !o && setActiveId(null)}>
        <SheetContent side="right" className="w-full sm:max-w-xl flex flex-col p-0">
          {active && activeTemplate ? (
            <>
              <SheetHeader className="px-6 pt-6 pb-3 border-b">
                <SheetTitle>{activeTemplate.name}</SheetTitle>
                <SheetDescription>
                  {active.id} · {active.reference}
                </SheetDescription>
                <StepRail steps={activeSteps} current={active.currentStep} />
              </SheetHeader>
              <div className="flex-1 overflow-y-auto px-6 py-4">
                <StepForm
                  stepKey={activeSteps[Math.min(active.currentStep, activeSteps.length - 1)]}
                  values={formValues}
                  onChange={(k, v) => setFormValues((p) => ({ ...p, [k]: v }))}
                  done={active.status === "completed"}
                />
              </div>
              <SheetFooter className="px-6 py-4 border-t gap-2">
                <Button variant="outline" onClick={() => setActiveId(null)}>
                  Close
                </Button>
                {active.status !== "completed" ? (
                  <Button onClick={advance}>
                    {active.currentStep >= activeSteps.length - 1
                      ? "Complete workflow"
                      : "Save & next step"}
                  </Button>
                ) : null}
              </SheetFooter>
            </>
          ) : null}
        </SheetContent>
      </Sheet>
    </>
  );
}

function WorkflowCard({
  wf,
  template,
  onOpen,
  cta = "Continue",
}: {
  wf: WorkflowInstance;
  template: WorkflowTemplate | undefined;
  onOpen: () => void;
  cta?: string;
}) {
  const steps = (template?.steps ?? []) as WorkflowStepKey[];
  const currentStepKey = steps[Math.min(wf.currentStep, Math.max(steps.length - 1, 0))];
  const stepLabel = currentStepKey ? STEP_LIBRARY[currentStepKey].title : "—";
  return (
    <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="text-base font-semibold">{template?.name}</div>
          <div className="text-xs text-muted-foreground">{wf.id} · {wf.reference}</div>
        </div>
        <StatusPill status={wf.status} />
      </div>
      <div className="mt-3 text-xs text-muted-foreground">Current step</div>
      <div className="text-sm font-medium">{stepLabel}</div>
      <div className="mt-4 flex justify-end">
        <Button size="sm" onClick={onOpen}>
          <Play className="h-3.5 w-3.5" /> {cta}
        </Button>
      </div>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const map: Record<WorkflowStatus, { label: string; variant: "default" | "secondary" | "outline" }> = {
    queued: { label: "Queued", variant: "outline" },
    "in-progress": { label: "Active", variant: "default" },
    completed: { label: "Completed", variant: "secondary" },
  };
  const m = map[status as WorkflowStatus] ?? { label: status, variant: "outline" as const };
  return <Badge variant={m.variant}>{m.label}</Badge>;
}

function StepRail({ steps, current }: { steps: WorkflowStepKey[]; current: number }) {
  return (
    <div className="flex flex-wrap items-center gap-1 pt-2">
      {steps.map((s, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <div key={s} className="flex items-center gap-1">
            <div
              className={
                "flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs " +
                (active
                  ? "border-primary bg-primary text-primary-foreground"
                  : done
                    ? "border-border bg-muted text-foreground"
                    : "border-border text-muted-foreground")
              }
            >
              {done ? <CheckCircle2 className="h-3 w-3" /> : <Circle className="h-3 w-3" />}
              <span>{STEP_LIBRARY[s].title}</span>
            </div>
            {i < steps.length - 1 ? (
              <ChevronRight className="h-3 w-3 text-muted-foreground" />
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

function StepForm({
  stepKey,
  values,
  onChange,
  done,
}: {
  stepKey: WorkflowStepKey;
  values: Record<string, string>;
  onChange: (k: string, v: string) => void;
  done: boolean;
}) {
  const step = STEP_LIBRARY[stepKey];
  const fields = useMemo(() => stepFields(stepKey), [stepKey]);

  return (
    <div className="space-y-4">
      <div>
        <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {step.module}
        </div>
        <h3 className="text-lg font-semibold">{step.title}</h3>
        <p className="text-sm text-muted-foreground">{step.description}</p>
      </div>
      {done ? (
        <div className="rounded-md border border-border bg-muted/40 p-4 text-sm text-muted-foreground">
          This workflow is completed. All steps were captured.
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {fields.map((f) => (
            <label
              key={f.name}
              className={"block " + (f.full ? "col-span-2" : "")}
            >
              <span className="mb-1.5 block text-xs font-semibold">{f.label}</span>
              {f.type === "select" ? (
                <select
                  className="input"
                  value={values[f.name] ?? ""}
                  onChange={(e) => onChange(f.name, e.target.value)}
                >
                  <option value="">Select…</option>
                  {f.options?.map((o) => (
                    <option key={o} value={o}>
                      {o}
                    </option>
                  ))}
                </select>
              ) : f.type === "textarea" ? (
                <textarea
                  className="input min-h-[80px]"
                  value={values[f.name] ?? ""}
                  onChange={(e) => onChange(f.name, e.target.value)}
                  placeholder={f.placeholder}
                />
              ) : (
                <input
                  type={f.type}
                  className="input"
                  value={values[f.name] ?? ""}
                  onChange={(e) => onChange(f.name, e.target.value)}
                  placeholder={f.placeholder}
                />
              )}
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

type Field = {
  name: string;
  label: string;
  type: "text" | "number" | "date" | "select" | "textarea";
  options?: string[];
  placeholder?: string;
  full?: boolean;
};

function stepFields(key: WorkflowStepKey): Field[] {
  switch (key) {
    case "supplier":
      return [
        {
          name: "supplier",
          label: "Supplier",
          type: "select",
          options: ["Sunrise Dairy Coop", "Green Valley Farms", "Coast Fruits Ltd", "PackRight Industries"],
        },
        { name: "note", label: "Delivery note #", type: "text", placeholder: "DN-2026-0019" },
        { name: "contact", label: "Contact person", type: "text", placeholder: "Samuel N." },
        { name: "phone", label: "Phone", type: "text", placeholder: "+254…" },
      ];
    case "raw-material":
      return [
        {
          name: "material",
          label: "Raw material",
          type: "select",
          options: ["Raw Milk", "Maize Grain", "Mango Pulp", "Sugar", "PET Bottles 500ml"],
        },
        { name: "lot", label: "Supplier lot #", type: "text", placeholder: "SDC-9921" },
        { name: "uom", label: "UoM", type: "select", options: ["L", "kg", "pcs"] },
        { name: "grade", label: "Grade", type: "select", options: ["A", "B", "C"] },
      ];
    case "quality-check":
      return [
        { name: "result", label: "Result", type: "select", options: ["Pass", "Partial", "Reject"] },
        { name: "temp", label: "Temp on arrival", type: "text", placeholder: "4.2 °C" },
        { name: "notes", label: "Inspection notes", type: "textarea", full: true, placeholder: "Visual, smell, sample test…" },
      ];
    case "storage-intake":
      return [
        { name: "qty", label: "Qty received", type: "number", placeholder: "2400" },
        {
          name: "location",
          label: "Storage location",
          type: "select",
          options: ["Cold Room A", "Silo 2", "Packaging Store", "Quarantine"],
        },
        { name: "harvest", label: "Harvest date", type: "date" },
        { name: "expiry", label: "Expiry date", type: "date" },
      ];
    case "recipe-select":
      return [
        {
          name: "recipe",
          label: "Recipe / BOM",
          type: "select",
          options: ["Mango Nectar 1L v3", "Yoghurt 500ml v2", "Maize Flour 2kg v1"],
        },
        { name: "qty", label: "Planned output qty", type: "number", placeholder: "1200" },
        { name: "line", label: "Production line", type: "select", options: ["Line A", "Line B"], full: true },
      ];
    case "production-batch":
      return [
        { name: "batch", label: "Batch #", type: "text", placeholder: "B-2026-0042" },
        { name: "operator", label: "Operator", type: "text", placeholder: "Aisha M." },
        { name: "start", label: "Start time", type: "text", placeholder: "08:30" },
        { name: "yield", label: "Actual yield", type: "number", placeholder: "1185" },
      ];
    case "packaging":
      return [
        { name: "sku", label: "SKU", type: "select", options: ["MNG-1L", "MNG-500ML", "YOG-500ML"] },
        { name: "units", label: "Units packed", type: "number", placeholder: "1200" },
        { name: "packLot", label: "Packaging lot", type: "text", placeholder: "PK-2026-0033" },
        { name: "best", label: "Best before", type: "date" },
      ];
    case "finished-good":
      return [
        {
          name: "store",
          label: "Finished goods store",
          type: "select",
          options: ["FG Main", "FG Cold", "FG Quarantine"],
        },
        { name: "pallets", label: "Pallets", type: "number", placeholder: "4" },
        { name: "qr", label: "QR / batch code", type: "text", full: true, placeholder: "Scan or paste" },
      ];
    case "dispatch":
      return [
        { name: "order", label: "Sales order #", type: "text", placeholder: "SO-2026-0091" },
        { name: "customer", label: "Customer", type: "text", placeholder: "Carrefour Westgate" },
        { name: "vehicle", label: "Vehicle reg", type: "text", placeholder: "KCA 442X" },
        { name: "driver", label: "Driver", type: "text", placeholder: "Peter K." },
      ];
  }
}
