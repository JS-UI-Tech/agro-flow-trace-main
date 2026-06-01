import { useSyncExternalStore } from "react";

export interface PackagedProduct {
  id: string;
  code: string;
}

export interface PackagedBox {
  id: string;
  code: string;
  products: PackagedProduct[];
}

export interface ProductionRun {
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

const seed: ProductionRun[] = [
  {
    id: "PR-3320",
    code: "PR-3320",
    batch: "PB-2026-0451",
    product: "Mango Juice 500ml",
    packaging: "PET 500ml + cap",
    mfg: "2026-05-19",
    expiry: "2026-11-19",
    createdAt: "2026-05-19 10:12",
    status: "Pending QC",
    boxes: Array.from({ length: 3 }).map((_, bi) => ({
      id: `BX-${3320}-${bi + 1}`,
      code: `BX-3320-${String(bi + 1).padStart(3, "0")}`,
      products: Array.from({ length: 6 }).map((__, pi) => ({
        id: `PD-${3320}-${bi + 1}-${pi + 1}`,
        code: `PD-3320-${String(bi + 1).padStart(3, "0")}-${String(pi + 1).padStart(3, "0")}`,
      })),
    })),
  },
  {
    id: "PR-3318",
    code: "PR-3318",
    batch: "PB-2026-0449",
    product: "Pineapple Juice 1L",
    packaging: "TetraPak 1L",
    mfg: "2026-05-15",
    expiry: "2026-11-15",
    createdAt: "2026-05-15 08:30",
    status: "Ready for dispatch",
    boxes: Array.from({ length: 5 }).map((_, bi) => ({
      id: `BX-${3318}-${bi + 1}`,
      code: `BX-3318-${String(bi + 1).padStart(3, "0")}`,
      products: Array.from({ length: 8 }).map((__, pi) => ({
        id: `PD-${3318}-${bi + 1}-${pi + 1}`,
        code: `PD-3318-${String(bi + 1).padStart(3, "0")}-${String(pi + 1).padStart(3, "0")}`,
      })),
    })),
  },
  {
    id: "PR-3315",
    code: "PR-3315",
    batch: "PB-2026-0446",
    product: "Orange Nectar 250ml",
    packaging: "TetraPak 250ml",
    mfg: "2026-05-10",
    expiry: "2026-11-10",
    createdAt: "2026-05-10 14:45",
    status: "Dispatched",
    boxes: Array.from({ length: 8 }).map((_, bi) => ({
      id: `BX-${3315}-${bi + 1}`,
      code: `BX-3315-${String(bi + 1).padStart(3, "0")}`,
      products: Array.from({ length: 24 }).map((__, pi) => ({
        id: `PD-${3315}-${bi + 1}-${pi + 1}`,
        code: `PD-3315-${String(bi + 1).padStart(3, "0")}-${String(pi + 1).padStart(3, "0")}`,
      })),
    })),
  },
  {
    id: "PR-3312",
    code: "PR-3312",
    batch: "PB-2026-0443",
    product: "Dried Mango Slices 2kg",
    packaging: "Paper bag 2kg",
    mfg: "2026-05-05",
    expiry: "2027-05-05",
    createdAt: "2026-05-05 09:20",
    status: "Dispatched",
    boxes: Array.from({ length: 2 }).map((_, bi) => ({
      id: `BX-${3312}-${bi + 1}`,
      code: `BX-3312-${String(bi + 1).padStart(3, "0")}`,
      products: Array.from({ length: 4 }).map((__, pi) => ({
        id: `PD-${3312}-${bi + 1}-${pi + 1}`,
        code: `PD-3312-${String(bi + 1).padStart(3, "0")}-${String(pi + 1).padStart(3, "0")}`,
      })),
    })),
  },
];

let state: { runs: ProductionRun[] } = { runs: seed };
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export const getRuns = () => state.runs;
export const getRun = (id: string) => state.runs.find((r) => r.id === id) ?? null;

function nextRunNumber() {
  const max = state.runs
    .map((r) => parseInt(r.id.replace(/\D/g, ""), 10) || 0)
    .reduce((a, b) => Math.max(a, b), 3320);
  return max + 1;
}

export interface NewRunInput {
  batch: string;
  product: string;
  packaging: string;
  mfg: string;
  expiry: string;
  boxCount: number;
  productsPerBox: number;
}

export function createRun(input: NewRunInput): ProductionRun {
  const n = nextRunNumber();
  const code = `PR-${n}`;
  const run: ProductionRun = {
    id: code,
    code,
    batch: input.batch,
    product: input.product,
    packaging: input.packaging,
    mfg: input.mfg,
    expiry: input.expiry,
    createdAt: new Date().toLocaleString(),
    status: "Pending QC",
    boxes: Array.from({ length: input.boxCount }).map((_, bi) => ({
      id: `BX-${n}-${bi + 1}`,
      code: `BX-${n}-${String(bi + 1).padStart(3, "0")}`,
      products: Array.from({ length: input.productsPerBox }).map((__, pi) => ({
        id: `PD-${n}-${bi + 1}-${pi + 1}`,
        code: `PD-${n}-${String(bi + 1).padStart(3, "0")}-${String(pi + 1).padStart(3, "0")}`,
      })),
    })),
  };
  state = { runs: [run, ...state.runs] };
  emit();
  return run;
}

export function usePackagingState() {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => state,
    () => state,
  );
}