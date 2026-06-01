import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import { completeBatch, getActiveBatch, updateStep, useBatchesState } from "@/lib/batches-store";

export const Route = createFileRoute("/production-batches_/run/$batchId")({
  head: () => ({ meta: [{ title: "Batch run — AgroTrace" }] }),
  component: RunPage,
});

function RunPage() {
  const { batchId } = Route.useParams();
  useBatchesState(); // re-render on store changes
  const navigate = useNavigate();
  const batch = getActiveBatch(batchId);
  const [activeIdx, setActiveIdx] = useState(() => {
    if (!batch) return 0;
    const i = batch.recipe.steps.findIndex((s) => !batch.stepState[s.id]?.done);
    return i === -1 ? batch.recipe.steps.length - 1 : i;
  });

  const allDone = useMemo(
    () => (batch ? batch.recipe.steps.every((s) => batch.stepState[s.id]?.done) : false),
    [batch],
  );

  if (!batch) {
    return (
      <>
        <PageHeader title="Batch not found" />
        <div className="p-6">
          <Button asChild variant="outline">
            <Link to="/production-batches"><ArrowLeft /> Back to batches</Link>
          </Button>
        </div>
      </>
    );
  }

  const steps = batch.recipe.steps;
  const total = steps.length;
  const doneCount = steps.filter((s) => batch.stepState[s.id]?.done).length;
  const current = steps[activeIdx];
  const currentState = batch.stepState[current.id] ?? { done: false, value: "" };
  const needsValue = current.kind === "input" && !currentState.value;

  const goPrev = () => setActiveIdx((i) => Math.max(0, i - 1));
  const goNext = () => setActiveIdx((i) => Math.min(total - 1, i + 1));

  const markComplete = () => {
    updateStep(batch.batchId, current.id, { done: true });
    if (activeIdx < total - 1) setActiveIdx(activeIdx + 1);
  };

  const release = () => {
    completeBatch(batch.batchId);
    navigate({ to: "/production-batches" });
  };

  return (
    <>
      <PageHeader
        title={`${batch.batchId} — ${batch.order.product}`}
        description={`Recipe ${batch.recipe.code} ${batch.recipe.version} • Line ${batch.order.line} • Supervisor ${batch.order.supervisor}`}
        actions={
          <Button asChild variant="outline">
            <Link to="/production-batches"><ArrowLeft /> Back</Link>
          </Button>
        }
      />

      <div className="p-6">
        <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
          <span>Progress</span>
          <span>{doneCount} / {total} steps complete</span>
        </div>
        <Progress value={(doneCount / total) * 100} className="h-2" />

        {/* Horizontal stepper */}
        <div className="mt-6 overflow-x-auto">
          <ol className="flex min-w-full items-center gap-2">
            {steps.map((s, idx) => {
              const done = batch.stepState[s.id]?.done;
              const isActive = idx === activeIdx;
              return (
                <li key={s.id} className="flex flex-1 items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveIdx(idx)}
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 text-xs font-semibold transition ${
                      done
                        ? "border-primary bg-primary text-primary-foreground"
                        : isActive
                          ? "border-primary bg-background text-primary"
                          : "border-border bg-background text-muted-foreground"
                    }`}
                    title={s.title}
                  >
                    {done ? <Check className="h-4 w-4" /> : idx + 1}
                  </button>
                  {idx < total - 1 && (
                    <div className={`h-0.5 flex-1 ${done ? "bg-primary" : "bg-border"}`} />
                  )}
                </li>
              );
            })}
          </ol>
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_280px]">
          {/* Current step card */}
          <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Step {activeIdx + 1} of {total}
              </span>
              <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
                {current.kind === "input" ? "Record value" : "Confirm"}
              </span>
            </div>
            <h2 className="mt-2 text-xl font-semibold text-foreground">{current.title}</h2>
            <p className="mt-2 text-sm text-muted-foreground">{current.detail}</p>

            {current.kind === "input" && (
              <div className="mt-6 max-w-md space-y-1">
                <Label className="text-xs">Actual {current.unit ? `(${current.unit})` : ""}</Label>
                <Input
                  type="text"
                  inputMode="decimal"
                  placeholder={current.expected ?? ""}
                  value={currentState.value ?? ""}
                  onChange={(e) => updateStep(batch.batchId, current.id, { value: e.target.value })}
                  disabled={currentState.done}
                />
                {current.expected && (
                  <p className="text-xs text-muted-foreground">Expected: {current.expected}</p>
                )}
              </div>
            )}

            <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-5">
              <Button variant="outline" onClick={goPrev} disabled={activeIdx === 0}>
                <ArrowLeft /> Previous
              </Button>
              <div className="flex gap-2">
                {currentState.done ? (
                  activeIdx < total - 1 ? (
                    <Button onClick={goNext}>Next step <ArrowRight /></Button>
                  ) : (
                    <Button onClick={release} disabled={!allDone}>
                      {allDone ? "Release batch to records" : "Complete remaining steps"}
                    </Button>
                  )
                ) : (
                  <Button onClick={markComplete} disabled={needsValue}>
                    <Check /> Mark step complete
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Side step list */}
          <aside className="rounded-lg border border-border bg-card p-4">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">All steps</h3>
            <ol className="space-y-1">
              {steps.map((s, idx) => {
                const done = batch.stepState[s.id]?.done;
                const isActive = idx === activeIdx;
                return (
                  <li key={s.id}>
                    <button
                      type="button"
                      onClick={() => setActiveIdx(idx)}
                      className={`flex w-full items-start gap-2 rounded-md px-2 py-2 text-left text-sm transition ${
                        isActive ? "bg-muted" : "hover:bg-muted/50"
                      }`}
                    >
                      <span
                        className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold ${
                          done
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {done ? <Check className="h-3 w-3" /> : idx + 1}
                      </span>
                      <span className={`flex-1 leading-tight ${done ? "text-muted-foreground line-through" : "text-foreground"}`}>
                        {s.title}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ol>

            {allDone && (
              <Button className="mt-4 w-full" onClick={release}>
                Release batch
              </Button>
            )}
          </aside>
        </div>
      </div>
    </>
  );
}