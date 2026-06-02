import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";

/* -------------------------------------------------------------------------- */
/* Row shape types (match the field names in src/lib/mock-data.ts)            */
/* -------------------------------------------------------------------------- */

export type Supplier = {
  id: string;
  name: string;
  location: string;
  materials: string;
  status: string;
  risk: string;
  cert: string;
  rejection: string;
};

export type RawMaterial = {
  id: string;
  material: string;
  supplier: string;
  lot: string;
  qty: string;
  received: string;
  expiry: string;
  status: string;
  location: string;
};

export type ProductionBatch = {
  id: string;
  product: string;
  recipe: string;
  line: string;
  supervisor: string;
  start: string;
  end: string;
  yield: string;
  waste: string;
  status: string;
};

export type FinishedGood = {
  id: string;
  product: string;
  batch: string;
  qty: string;
  location: string;
  mfg: string;
  expiry: string;
  status: string;
};

export type QcCheck = {
  id: string;
  batch: string;
  checkpoint: string;
  value: string;
  limit: string;
  inspector: string;
  time: string;
  status: string;
};

export type Dispatch = {
  id: string;
  customer: string;
  product: string;
  qty: string;
  vehicle: string;
  driver: string;
  destination: string;
  status: string;
  date: string;
};

export type Recall = {
  id: string;
  product: string;
  batch: string;
  reason: string;
  produced: string;
  dispatched: string;
  recovered: string;
  status: string;
  opened: string;
};

export type WasteRecord = {
  id: string;
  source: string;
  material: string;
  qty: string;
  reason: string;
  disposal: string;
  date: string;
  status: string;
};

export type ReturnRecord = {
  id: string;
  customer: string;
  product: string;
  batch: string;
  qty: string;
  reason: string;
  decision: string;
  date: string;
};

export type Dashboard = {
  kpis: {
    activeBatches: number;
    rawLotsToday: number;
    fgAwaitingQc: number;
    expiringStock: number;
    openRecalls: number;
    qcFailures: number;
    dispatchedThisWeek: number;
    supplierRejectionRate: number;
  };
  productionByProduct: { product: string; volume: number }[];
  qcTrend: { day: string; pass: number; fail: number }[];
  expiryRisk: { name: string; value: number }[];
  dispatchByCustomer: { customer: string; volume: number }[];
  wasteByReason: { reason: string; value: number }[];
  recentBatches: ProductionBatch[];
};

export type Recipe = {
  code: string;
  product: string;
  version: string;
  yield: string;
  shelf: string;
  status: string;
  ingredients: unknown[];
  steps: unknown[];
};

export type ProductionOrder = {
  id: string;
  product: string;
  recipeCode: string;
  line: string;
  supervisor: string;
  due: string;
  status: string;
};

export type PackagingRun = {
  id: string;
  code: string;
  batch: string;
  product: string;
  packaging: string;
  mfg: string;
  expiry: string;
  status: string;
  boxes: unknown[];
};

export type WorkflowTemplate = {
  id: string;
  name: string;
  description: string;
  category: string;
  steps: unknown[];
};

export type WorkflowInstance = {
  id: string;
  templateId: string;
  assignee: string;
  reference: string;
  status: string;
  currentStep: number;
  stepData: unknown;
};

export type CompanyConfig = {
  sections: unknown[];
};

export type AuditEntry = {
  action: string;
  entityType: string;
  entityId: string;
  user: string;
  time: string;
};

export type ReportItem = {
  id: string;
  title: string;
  metric: string;
  value: string;
};

export type TraceResult = {
  code: string;
  matches: { type: string; record: unknown }[];
  related: unknown[];
};

/* -------------------------------------------------------------------------- */
/* Query hooks                                                                */
/* -------------------------------------------------------------------------- */

export function useSuppliers() {
  return useQuery({
    queryKey: ["suppliers"],
    queryFn: () => apiFetch<Supplier[]>("/api/suppliers"),
  });
}

export function useRawMaterials() {
  return useQuery({
    queryKey: ["raw-materials"],
    queryFn: () => apiFetch<RawMaterial[]>("/api/raw-materials"),
  });
}

export function useProductionBatches() {
  return useQuery({
    queryKey: ["production-batches"],
    queryFn: () => apiFetch<ProductionBatch[]>("/api/production-batches"),
  });
}

export function useFinishedGoods() {
  return useQuery({
    queryKey: ["finished-goods"],
    queryFn: () => apiFetch<FinishedGood[]>("/api/finished-goods"),
  });
}

export function useQcChecks() {
  return useQuery({
    queryKey: ["qc-checks"],
    queryFn: () => apiFetch<QcCheck[]>("/api/qc-checks"),
  });
}

export function useDispatches() {
  return useQuery({
    queryKey: ["dispatches"],
    queryFn: () => apiFetch<Dispatch[]>("/api/dispatches"),
  });
}

export function useRecalls() {
  return useQuery({
    queryKey: ["recalls"],
    queryFn: () => apiFetch<Recall[]>("/api/recalls"),
  });
}

export function useWasteRecords() {
  return useQuery({
    queryKey: ["waste-records"],
    queryFn: () => apiFetch<WasteRecord[]>("/api/waste-records"),
  });
}

export function useReturns() {
  return useQuery({
    queryKey: ["returns"],
    queryFn: () => apiFetch<ReturnRecord[]>("/api/returns"),
  });
}

export function useDashboard() {
  return useQuery({
    queryKey: ["dashboard"],
    queryFn: () => apiFetch<Dashboard>("/api/dashboard"),
  });
}

export function useRecipes() {
  return useQuery({
    queryKey: ["recipes"],
    queryFn: () => apiFetch<Recipe[]>("/api/recipes"),
  });
}

export function useProductionOrders() {
  return useQuery({
    queryKey: ["production-orders"],
    queryFn: () => apiFetch<ProductionOrder[]>("/api/production-orders"),
  });
}

export function usePackagingRuns() {
  return useQuery({
    queryKey: ["packaging-runs"],
    queryFn: () => apiFetch<PackagingRun[]>("/api/packaging-runs"),
  });
}

export function useWorkflowTemplates() {
  return useQuery({
    queryKey: ["workflow-templates"],
    queryFn: () => apiFetch<WorkflowTemplate[]>("/api/workflow-templates"),
  });
}

export function useWorkflowInstances() {
  return useQuery({
    queryKey: ["workflow-instances"],
    queryFn: () => apiFetch<WorkflowInstance[]>("/api/workflow-instances"),
  });
}

export function useCompanyConfig() {
  return useQuery({
    queryKey: ["company-config"],
    queryFn: () => apiFetch<CompanyConfig>("/api/company-config"),
  });
}

export function useAudit() {
  return useQuery({
    queryKey: ["audit"],
    queryFn: () => apiFetch<AuditEntry[]>("/api/audit?limit=100"),
  });
}

export function useReports() {
  return useQuery({
    queryKey: ["reports"],
    queryFn: () => apiFetch<ReportItem[]>("/api/reports"),
  });
}

export function useTrace(code: string) {
  return useQuery({
    queryKey: ["trace", code],
    queryFn: () => apiFetch<TraceResult>(`/api/trace/${code}`),
    enabled: Boolean(code),
  });
}

/* -------------------------------------------------------------------------- */
/* Generic mutation hooks                                                      */
/* -------------------------------------------------------------------------- */

/**
 * Create a record via POST to the given resource path (e.g. "/api/suppliers").
 * On success invalidates the matching query key so lists refetch.
 */
export function useCreate<TData = unknown, TBody = unknown>(
  resourcePath: string,
  invalidateKey: string,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: TBody) =>
      apiFetch<TData>(resourcePath, {
        method: "POST",
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [invalidateKey] });
    },
  });
}

/**
 * Update a record via PATCH to `${resourcePath}/${id}` (resourcePath like "/api/suppliers").
 * On success invalidates the matching query key so lists refetch.
 */
export function useUpdate<TData = unknown, TBody = unknown>(
  resourcePath: string,
  invalidateKey: string,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: TBody }) =>
      apiFetch<TData>(`${resourcePath}/${id}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [invalidateKey] });
    },
  });
}
