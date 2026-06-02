import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
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
import {
  STEP_LIBRARY,
  ASSIGNED_WORKFLOWS,
  type AssignedWorkflow,
  type WorkflowStepKey,
  type WorkflowTemplate,
} from "@/lib/workflows";
import { useWorkflowTemplates, useCreate, useUpdate } from "@/hooks/api";
import { ChevronRight, Plus, Send, X } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/workflow-templates")({
  head: () => ({ meta: [{ title: "Workflow Templates — AgroTrace" }] }),
  component: TemplatesPage,
});

const TEAM = ["Aisha M.", "Samuel N.", "Peter K.", "Grace W.", "You"];

function TemplatesPage() {
  const templatesQuery = useWorkflowTemplates();
  const templates = (templatesQuery.data ?? []) as unknown as WorkflowTemplate[];
  const createTemplate = useCreate("/api/workflow-templates", "workflow-templates");
  const updateTemplate = useUpdate("/api/workflow-templates", "workflow-templates");
  const templateById = (id: string) => templates.find((t) => t.id === id);

  const [assigned, setAssigned] = useState<AssignedWorkflow[]>(ASSIGNED_WORKFLOWS);
  const [editing, setEditing] = useState<WorkflowTemplate | null>(null);
  const [mode, setMode] = useState<"edit" | "create" | "assign" | null>(null);
  const [draft, setDraft] = useState<WorkflowTemplate>(emptyTemplate());
  const [assignTo, setAssignTo] = useState("Aisha M.");
  const [assignRef, setAssignRef] = useState("");

  const openCreate = () => {
    setDraft(emptyTemplate());
    setMode("create");
  };
  const openEdit = (t: WorkflowTemplate) => {
    setDraft({ ...t, steps: [...t.steps] });
    setEditing(t);
    setMode("edit");
  };
  const openAssign = (t: WorkflowTemplate) => {
    setEditing(t);
    setAssignRef("");
    setMode("assign");
  };
  const close = () => {
    setMode(null);
    setEditing(null);
  };

  const save = () => {
    if (!draft.name.trim()) {
      toast.error("Name is required");
      return;
    }
    if (draft.steps.length === 0) {
      toast.error("Add at least one step");
      return;
    }
    if (mode === "create") {
      createTemplate.mutate(
        { ...draft, id: `wf-${Date.now()}` },
        {
          onSuccess: () => {
            toast.success("Template created");
            close();
          },
          onError: () => toast.error("Failed to create template"),
        },
      );
    } else if (mode === "edit" && editing) {
      updateTemplate.mutate(
        { id: editing.id, body: { ...draft, id: editing.id } },
        {
          onSuccess: () => {
            toast.success("Template updated");
            close();
          },
          onError: () => toast.error("Failed to update template"),
        },
      );
    }
  };

  const assign = () => {
    if (!editing) return;
    if (!assignRef.trim()) {
      toast.error("Reference is required");
      return;
    }
    const wf: AssignedWorkflow = {
      id: `WF-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 9000) + 1000)}`,
      templateId: editing.id,
      assignee: assignTo,
      reference: assignRef,
      status: "queued",
      currentStep: 0,
      createdAt: new Date().toISOString().slice(0, 16).replace("T", " "),
    };
    setAssigned((l) => [wf, ...l]);
    toast.success(`Assigned ${wf.id} to ${assignTo}`);
    close();
  };

  return (
    <>
      <PageHeader
        title="Workflow Templates"
        description="Define the step sequences your team will follow, and assign them to employees."
        actions={
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" /> New template
          </Button>
        }
      />
      <div className="grid gap-4 p-6 md:grid-cols-2 xl:grid-cols-3">
        {templates.map((t) => (
          <div key={t.id} className="rounded-lg border border-border bg-card p-4 shadow-sm">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="text-base font-semibold">{t.name}</div>
                <div className="mt-0.5 text-xs text-muted-foreground">{t.description}</div>
              </div>
              <Badge variant="outline">{t.category}</Badge>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-1">
              {t.steps.map((s, i) => (
                <div key={s + i} className="flex items-center gap-1">
                  <span className="rounded-md border border-border bg-muted/40 px-2 py-0.5 text-xs">
                    {STEP_LIBRARY[s].title}
                  </span>
                  {i < t.steps.length - 1 ? (
                    <ChevronRight className="h-3 w-3 text-muted-foreground" />
                  ) : null}
                </div>
              ))}
            </div>
            <div className="mt-4 flex flex-wrap justify-end gap-2">
              <Button size="sm" variant="outline" onClick={() => openEdit(t)}>
                Edit
              </Button>
              <Button size="sm" onClick={() => openAssign(t)}>
                <Send className="h-3.5 w-3.5" /> Assign
              </Button>
            </div>
          </div>
        ))}
      </div>

      <div className="p-6 pt-0">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Recently assigned ({assigned.length})
        </h2>
        <div className="overflow-hidden rounded-lg border border-border bg-card">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-2 text-left">ID</th>
                <th className="px-4 py-2 text-left">Template</th>
                <th className="px-4 py-2 text-left">Reference</th>
                <th className="px-4 py-2 text-left">Assignee</th>
                <th className="px-4 py-2 text-left">Status</th>
                <th className="px-4 py-2 text-left">Created</th>
              </tr>
            </thead>
            <tbody>
              {assigned.map((wf) => (
                <tr key={wf.id} className="border-t border-border">
                  <td className="px-4 py-2 font-medium">{wf.id}</td>
                  <td className="px-4 py-2">{templateById(wf.templateId)?.name ?? "—"}</td>
                  <td className="px-4 py-2 text-muted-foreground">{wf.reference}</td>
                  <td className="px-4 py-2">{wf.assignee}</td>
                  <td className="px-4 py-2 capitalize">{wf.status.replace("-", " ")}</td>
                  <td className="px-4 py-2 text-muted-foreground">{wf.createdAt}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Sheet open={mode === "create" || mode === "edit"} onOpenChange={(o) => !o && close()}>
        <SheetContent side="right" className="w-full sm:max-w-xl flex flex-col p-0">
          <SheetHeader className="px-6 pt-6 pb-3 border-b">
            <SheetTitle>{mode === "create" ? "New template" : "Edit template"}</SheetTitle>
            <SheetDescription>
              Build the ordered sequence of steps that link forms across modules.
            </SheetDescription>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <label className="block col-span-2">
                <span className="mb-1.5 block text-xs font-semibold">Name</span>
                <input
                  className="input"
                  value={draft.name}
                  onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                  placeholder="Inbound Receiving"
                />
              </label>
              <label className="block col-span-2">
                <span className="mb-1.5 block text-xs font-semibold">Description</span>
                <textarea
                  className="input min-h-[60px]"
                  value={draft.description}
                  onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold">Category</span>
                <select
                  className="input"
                  value={draft.category}
                  onChange={(e) =>
                    setDraft({ ...draft, category: e.target.value as WorkflowTemplate["category"] })
                  }
                >
                  <option>Inbound</option>
                  <option>Production</option>
                  <option>Outbound</option>
                </select>
              </label>
            </div>

            <div className="rounded-lg border border-border bg-card/50 p-4">
              <div className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Steps
              </div>
              {draft.steps.length === 0 ? (
                <div className="text-sm text-muted-foreground">No steps yet — add one below.</div>
              ) : (
                <ol className="space-y-2">
                  {draft.steps.map((s, i) => (
                    <li
                      key={s + i}
                      className="flex items-center justify-between rounded-md border border-border bg-background px-3 py-2"
                    >
                      <div>
                        <div className="text-sm font-medium">
                          {i + 1}. {STEP_LIBRARY[s].title}
                        </div>
                        <div className="text-xs text-muted-foreground">{STEP_LIBRARY[s].module}</div>
                      </div>
                      <button
                        type="button"
                        className="text-muted-foreground hover:text-destructive"
                        onClick={() =>
                          setDraft({ ...draft, steps: draft.steps.filter((_, idx) => idx !== i) })
                        }
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </li>
                  ))}
                </ol>
              )}
              <div className="mt-3 flex gap-2">
                <select
                  className="input flex-1"
                  defaultValue=""
                  onChange={(e) => {
                    if (!e.target.value) return;
                    setDraft({ ...draft, steps: [...draft.steps, e.target.value as WorkflowStepKey] });
                    e.target.value = "";
                  }}
                >
                  <option value="">Add step…</option>
                  {Object.values(STEP_LIBRARY).map((s) => (
                    <option key={s.key} value={s.key}>
                      {s.module} — {s.title}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
          <SheetFooter className="px-6 py-4 border-t gap-2">
            <Button variant="outline" onClick={close}>
              Cancel
            </Button>
            <Button onClick={save}>Save template</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <Sheet open={mode === "assign"} onOpenChange={(o) => !o && close()}>
        <SheetContent side="right" className="w-full sm:max-w-md flex flex-col p-0">
          <SheetHeader className="px-6 pt-6 pb-3 border-b">
            <SheetTitle>Assign workflow</SheetTitle>
            <SheetDescription>{editing?.name}</SheetDescription>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold">Assign to</span>
              <select className="input" value={assignTo} onChange={(e) => setAssignTo(e.target.value)}>
                {TEAM.map((m) => (
                  <option key={m}>{m}</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold">Reference</span>
              <input
                className="input"
                value={assignRef}
                onChange={(e) => setAssignRef(e.target.value)}
                placeholder="Sunrise Dairy — DN-2026-0020"
              />
              <span className="mt-1 block text-xs text-muted-foreground">
                Short label so the assignee knows what this is about.
              </span>
            </label>
          </div>
          <SheetFooter className="px-6 py-4 border-t gap-2">
            <Button variant="outline" onClick={close}>
              Cancel
            </Button>
            <Button onClick={assign}>Assign &amp; queue</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </>
  );
}

function emptyTemplate(): WorkflowTemplate {
  return { id: "", name: "", description: "", category: "Inbound", steps: [] };
}
