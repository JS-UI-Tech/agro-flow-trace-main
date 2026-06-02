import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/DataTable";
import { StatusBadge } from "@/components/StatusBadge";
import { Progress } from "@/components/ui/progress";
import { startBatch, useBatchesState, type ProductionOrder } from "@/lib/batches-store";
import { useProductionOrders, useProductionBatches, useRecipes, type ProductionOrder as ApiProductionOrder } from "@/hooks/api";
import { apiFetch } from "@/lib/api-client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export const Route = createFileRoute("/production-batches")({
  head: () => ({ meta: [{ title: "Production Batches — AgroTrace" }] }),
  component: BatchesPage,
});

function BatchesPage() {
  const { active } = useBatchesState();
  const { data: orders = [] } = useProductionOrders();
  const { data: completed = [] } = useProductionBatches();
  const { data: recipes = [] } = useRecipes();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const handleStart = async (order: ApiProductionOrder) => {
    const storeOrder: ProductionOrder = {
      id: order.id,
      product: order.product,
      recipeCode: order.recipeCode,
      line: order.line,
      supervisor: order.supervisor,
      due: order.due,
    };
    const active = startBatch(storeOrder);
    if (!active) return;

    const r = recipes.find((rec) => rec.code === order.recipeCode);
    const recipe = `${order.recipeCode}${r?.version ? ` ${r.version}` : ""}`;
    try {
      await apiFetch("/api/production-batches", {
        method: "POST",
        body: JSON.stringify({
          id: active.batchId,
          product: order.product,
          recipe,
          line: order.line,
          supervisor: order.supervisor,
          start: new Date().toISOString(),
          status: "In Process",
        }),
      });
      queryClient.invalidateQueries({ queryKey: ["production-batches"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to start batch");
    }
    navigate({ to: "/production-batches/run/$batchId", params: { batchId: active.batchId } });
  };

  return (
    <>
      <PageHeader
        title="Production Batches"
        description="Start a batch from a production order, follow the recipe step-by-step, then release it to records."
      />
      <div className="space-y-6 p-6">
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Production orders awaiting start</h2>
          {orders.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border bg-card p-6 text-sm text-muted-foreground">
              All production orders have been started.
            </div>
          ) : (
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {orders.map((o) => {
                const r = recipes.find((r) => r.code === o.recipeCode);
                return (
                  <div key={o.id} className="rounded-lg border border-border bg-card p-4 shadow-sm">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="text-sm font-semibold text-foreground">{o.id}</h3>
                        <p className="text-xs text-muted-foreground">{o.product}</p>
                      </div>
                      <StatusBadge status="Queued" />
                    </div>
                    <dl className="mt-3 grid grid-cols-2 gap-2 text-xs">
                      <Info k="Recipe" v={`${o.recipeCode} ${r?.version ?? ""}`} />
                      <Info k="Line" v={o.line} />
                      <Info k="Supervisor" v={o.supervisor} />
                      <Info k="Due" v={o.due} />
                      <Info k="Steps" v={String(r?.steps.length ?? 0)} />
                    </dl>
                    <Button className="mt-4 w-full" onClick={() => handleStart(o)}>
                      Start batch &amp; open recipe
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">In-process batches</h2>
          {active.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border bg-card p-6 text-sm text-muted-foreground">
              No batches in process. Start one from a production order above.
            </div>
          ) : (
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {active.map((b) => {
                const total = b.recipe.steps.length;
                const done = b.recipe.steps.filter((s) => b.stepState[s.id]?.done).length;
                const pct = Math.round((done / total) * 100);
                const current = b.recipe.steps.find((s) => !b.stepState[s.id]?.done);
                return (
                  <div key={b.batchId} className="rounded-lg border border-border bg-card p-4 shadow-sm">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="text-sm font-semibold text-foreground">{b.batchId}</h3>
                        <p className="text-xs text-muted-foreground">
                          {b.order.product} • {b.recipe.code} {b.recipe.version}
                        </p>
                      </div>
                      <StatusBadge status="In Process" />
                    </div>
                    <div className="mt-3">
                      <div className="mb-1 flex justify-between text-xs text-muted-foreground">
                        <span>Step {done} / {total}</span>
                        <span>{pct}%</span>
                      </div>
                      <Progress value={pct} className="h-2" />
                    </div>
                    {current && (
                      <p className="mt-3 line-clamp-2 text-xs text-muted-foreground">
                        <span className="font-medium text-foreground">Next:</span> {current.title}
                      </p>
                    )}
                    <Button
                      variant="outline"
                      className="mt-3 w-full"
                      onClick={() => navigate({ to: "/production-batches/run/$batchId", params: { batchId: b.batchId } })}
                    >
                      Continue recipe
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Completed batch records</h2>
          <DataTable
            data={completed}
            columns={[
              { key: "id", header: "Batch" },
              { key: "product", header: "Product" },
              { key: "recipe", header: "Recipe" },
              { key: "line", header: "Line" },
              { key: "supervisor", header: "Supervisor" },
              { key: "yield", header: "Yield" },
              { key: "waste", header: "Waste" },
              { key: "status", header: "Status", render: (r) => <StatusBadge status={r.status} /> },
            ]}
          />
        </section>
      </div>
    </>
  );
}

function Info({ k, v }: { k: string; v: string }) {
  return (
    <div>
      <dt className="text-[10px] uppercase tracking-wide text-muted-foreground">{k}</dt>
      <dd className="text-xs font-medium text-foreground">{v}</dd>
    </div>
  );
}