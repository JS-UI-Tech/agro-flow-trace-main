import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { QRCodeSVG } from "qrcode.react";
import { toast } from "sonner";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/StatusBadge";
import {
  ArrowLeft,
  Printer,
  Package,
  Box as BoxIcon,
  CheckCircle2,
  ClipboardList,
  Truck,
  Factory,
} from "lucide-react";
import { apiFetch } from "@/lib/api-client";

interface PackagedProduct {
  id: string;
  code: string;
}

interface PackagedBox {
  id: string;
  code: string;
  products: PackagedProduct[];
}

interface ProductionRun {
  id: string;
  code: string;
  batch: string;
  product: string;
  packaging: string;
  mfg: string;
  expiry: string;
  createdAt: string;
  boxes: PackagedBox[];
  status: string;
}

export const Route = createFileRoute("/packaging_/run/$runId")({
  head: () => ({ meta: [{ title: "Production run — AgroTrace" }] }),
  component: RunDetailPage,
});

const STEPS = [
  { key: "Production", icon: Factory },
  { key: "Packaging", icon: Package },
  { key: "QC", icon: ClipboardList },
  { key: "Ready for dispatch", icon: CheckCircle2 },
  { key: "Dispatched", icon: Truck },
];

function StatusTimeline({ status }: { status: string }) {
  const currentIndex = STEPS.findIndex((s) => s.key === status);
  return (
    <div className="mt-4">
      <div className="relative flex items-center justify-between">
        {STEPS.map((step, i) => {
          const Icon = step.icon;
          const done = currentIndex >= i;
          const active = currentIndex === i;
          return (
            <div key={step.key} className="relative z-10 flex flex-1 flex-col items-center gap-1.5">
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full border-2 transition ${
                  active || done
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-muted bg-muted text-muted-foreground"
                }`}
              >
                <Icon className="h-4 w-4" />
              </div>
              <span
                className={`text-[10px] font-medium uppercase tracking-wide ${
                  active ? "text-primary" : done ? "text-foreground" : "text-muted-foreground"
                }`}
              >
                {step.key}
              </span>
            </div>
          );
        })}
      </div>
      <div className="relative mx-4 mt-[-46px] flex items-center">
        {STEPS.slice(0, -1).map((_, i) => {
          const done = currentIndex > i;
          return (
            <div
              key={i}
              className={`h-0.5 flex-1 ${done ? "bg-primary" : "bg-muted"}`}
            />
          );
        })}
      </div>
    </div>
  );
}

function RunDetailPage() {
  const { runId } = Route.useParams();
  const queryClient = useQueryClient();
  const [activeBoxId, setActiveBoxId] = useState<string | null>(null);

  const {
    data: run,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["packaging-run", runId],
    queryFn: () => apiFetch<ProductionRun>(`/api/packaging-runs/${runId}`),
  });

  const statusMutation = useMutation({
    mutationFn: (status: string) =>
      apiFetch<ProductionRun>(`/api/packaging-runs/${runId}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      }),
    onSuccess: (_data, status) => {
      queryClient.invalidateQueries({ queryKey: ["packaging-run", runId] });
      queryClient.invalidateQueries({ queryKey: ["packaging-runs"] });
      toast.success("Status updated", { description: `${runId} · ${status}` });
    },
    onError: (error) => {
      toast.error("Failed to update status", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    },
  });

  if (isLoading) {
    return (
      <div className="p-6">
        <p className="text-sm text-muted-foreground">Loading production run…</p>
      </div>
    );
  }

  if (isError || !run) {
    return (
      <div className="p-6">
        <p className="text-sm text-muted-foreground">Production run not found.</p>
        <Button asChild variant="outline" className="mt-4">
          <Link to="/packaging">Back to Packaging</Link>
        </Button>
      </div>
    );
  }

  const boxes = run.boxes ?? [];
  const activeBox =
    boxes.find((b) => b.id === activeBoxId) ??
    boxes[0] ??
    null;
  const totalUnits = boxes.reduce(
    (s, b) => s + b.products.length,
    0,
  );

  return (
    <>
      <PageHeader
        title={`Production run ${run.code}`}
        description={`${run.product} · Batch ${run.batch}`}
        actions={
          <>
            <Button variant="outline" asChild>
              <Link to="/packaging">
                <ArrowLeft className="mr-1 h-4 w-4" /> Back
              </Link>
            </Button>
            <Button onClick={() => window.print()}>
              <Printer className="mr-1 h-4 w-4" /> Print labels
            </Button>
            <Button
              variant="secondary"
              disabled={
                statusMutation.isPending ||
                run.status === "Ready for dispatch"
              }
              onClick={() => statusMutation.mutate("Ready for dispatch")}
            >
              <CheckCircle2 className="mr-1 h-4 w-4" /> Mark ready
            </Button>
          </>
        }
      />
      <div className="p-6">
        {/* Status timeline */}
        <div className="mb-6 rounded-lg border border-border bg-card p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                Current status
              </p>
              <div className="mt-1">
                <StatusBadge status={run.status} />
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                Created
              </p>
              <p className="mt-1 text-sm font-medium">{run.createdAt}</p>
            </div>
          </div>
          <StatusTimeline status={run.status} />
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Run overview */}
          <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  Run code
                </p>
                <p className="mt-1 font-mono text-lg font-semibold">
                  {run.code}
                </p>
              </div>
              <div className="rounded-md border border-border bg-background p-2">
                <QRCodeSVG value={run.code} size={96} />
              </div>
            </div>
            <dl className="mt-5 space-y-2.5 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Batch</dt>
                <dd className="font-medium">{run.batch}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Product</dt>
                <dd className="font-medium">{run.product}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Packaging</dt>
                <dd className="font-medium">{run.packaging}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">MFG date</dt>
                <dd className="font-medium">{run.mfg}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Expiry date</dt>
                <dd className="font-medium">{run.expiry}</dd>
              </div>
              <div className="flex justify-between border-t border-border pt-2">
                <dt className="text-muted-foreground">Boxes</dt>
                <dd className="font-medium">{boxes.length}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Total units</dt>
                <dd className="font-semibold">
                  {totalUnits.toLocaleString()}
                </dd>
              </div>
            </dl>
          </div>

          {/* Boxes list */}
          <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BoxIcon className="h-4 w-4 text-muted-foreground" />
                <h3 className="text-sm font-semibold">
                  Boxes ({boxes.length})
                </h3>
              </div>
              {activeBox && (
                <span className="text-xs text-muted-foreground">
                  {activeBox.code} selected
                </span>
              )}
            </div>
            <div className="mt-4 max-h-[520px] space-y-2 overflow-y-auto pr-1">
              {boxes.map((b) => {
                const isActive =
                  b.id === activeBoxId ||
                  (activeBoxId === null && b.id === boxes[0]?.id);
                return (
                  <button
                    key={b.id}
                    onClick={() => setActiveBoxId(b.id)}
                    className={`flex w-full items-center justify-between rounded-md border px-3 py-2 text-left text-sm transition ${
                      isActive
                        ? "border-primary bg-primary/5"
                        : "border-border hover:bg-muted/50"
                    }`}
                  >
                    <div>
                      <div className="font-mono text-xs font-medium">
                        {b.code}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {b.products.length} units
                      </div>
                    </div>
                    <QRCodeSVG value={b.code} size={36} />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Unit grid */}
          <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-sm font-semibold">
                {activeBox
                  ? `Units in ${activeBox.code}`
                  : "Units"}
              </h3>
            </div>
            {activeBox ? (
              <div className="mt-4 grid max-h-[520px] grid-cols-2 gap-3 overflow-y-auto pr-1">
                {activeBox.products.map((p) => (
                  <div
                    key={p.id}
                    className="rounded-md border border-border p-3"
                  >
                    <div className="flex justify-center">
                      <QRCodeSVG value={p.code} size={72} />
                    </div>
                    <div className="mt-2 truncate text-center font-mono text-[10px] text-muted-foreground">
                      {p.code}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-4 text-sm text-muted-foreground">
                Pick a box on the left to see and print individual unit QR
                codes.
              </p>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
