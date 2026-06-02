import { useQuery } from "@tanstack/react-query";
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
