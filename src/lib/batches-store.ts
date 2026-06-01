import { useSyncExternalStore } from "react";
import { productionBatches } from "@/lib/mock-data";

export type StepKind = "check" | "input";

export interface RecipeStep {
  id: string;
  title: string;
  detail: string;
  kind: StepKind;
  unit?: string;
  expected?: string;
}

export interface Recipe {
  code: string;
  product: string;
  version: string;
  steps: RecipeStep[];
}

export interface ProductionOrder {
  id: string;
  product: string;
  recipeCode: string;
  line: string;
  supervisor: string;
  due: string;
}

export interface ActiveBatch {
  batchId: string;
  order: ProductionOrder;
  recipe: Recipe;
  startedAt: string;
  stepState: Record<string, { done: boolean; value?: string }>;
}

export const RECIPES: Recipe[] = [
  {
    code: "REC-MJ-500",
    product: "Mango Juice 500ml",
    version: "v2.1",
    steps: [
      { id: "s1", title: "Stage raw materials", detail: "Pull mango pulp (620 kg), sugar (420 kg), citric acid (4.2 kg) from storage WH-A.", kind: "check" },
      { id: "s2", title: "Sanitize blending tank", detail: "CIP cycle on tank EQ-MX-04. Confirm conductivity returns to baseline.", kind: "check" },
      { id: "s3", title: "Blend pulp + water", detail: "Run blender 15 min @ 1200 rpm. Record final volume.", kind: "input", unit: "L", expected: "≈ 4,420" },
      { id: "s4", title: "Add sugar & acids", detail: "Add sugar, citric & ascorbic acid. Mix 10 min until fully dissolved.", kind: "check" },
      { id: "s5", title: "QA pre-pasteurization sample", detail: "Record measured °Brix from lab.", kind: "input", unit: "°Brix", expected: "11.5 – 12.5" },
      { id: "s6", title: "Pasteurize", detail: "Hold at 85 °C × 15 s. Record peak temperature.", kind: "input", unit: "°C", expected: "85" },
      { id: "s7", title: "Cool to 25 °C", detail: "Confirm cooling completed before transfer to filler.", kind: "check" },
      { id: "s8", title: "Record final yield", detail: "Final yield sent to packaging line.", kind: "input", unit: "L", expected: "≈ 4,800" },
    ],
  },
  {
    code: "REC-PM-1L",
    product: "Pasteurized Milk 1L",
    version: "v3.0",
    steps: [
      { id: "s1", title: "Receive raw milk", detail: "Verify supplier lot + temperature on arrival.", kind: "input", unit: "°C", expected: "≤ 4" },
      { id: "s2", title: "Standardize fat", detail: "Adjust to 3.25%.", kind: "check" },
      { id: "s3", title: "Pasteurize HTST", detail: "72 °C × 15 s. Record peak.", kind: "input", unit: "°C", expected: "72" },
      { id: "s4", title: "Homogenize", detail: "Two-stage homogenization.", kind: "check" },
      { id: "s5", title: "Cool & store", detail: "Cool to 4 °C, route to packaging.", kind: "check" },
      { id: "s6", title: "Record yield", detail: "Total volume produced.", kind: "input", unit: "L", expected: "≈ 2,400" },
    ],
  },
  {
    code: "REC-MF-2K",
    product: "Maize Flour 2kg",
    version: "v1.4",
    steps: [
      { id: "s1", title: "Clean grain", detail: "Remove stones, dust, broken kernels.", kind: "check" },
      { id: "s2", title: "Condition with water", detail: "Add moisture, rest 12 h.", kind: "check" },
      { id: "s3", title: "Mill & sift", detail: "Record extraction rate.", kind: "input", unit: "%", expected: "78" },
      { id: "s4", title: "Final yield", detail: "Flour to packaging.", kind: "input", unit: "kg", expected: "≈ 7,800" },
    ],
  },
];

const INITIAL_ORDERS: ProductionOrder[] = [
  { id: "PO-2026-0182", product: "Mango Juice 500ml", recipeCode: "REC-MJ-500", line: "Line A", supervisor: "J. Otieno", due: "2026-05-22" },
  { id: "PO-2026-0183", product: "Pasteurized Milk 1L", recipeCode: "REC-PM-1L", line: "Line B", supervisor: "M. Wanjiku", due: "2026-05-22" },
  { id: "PO-2026-0184", product: "Maize Flour 2kg", recipeCode: "REC-MF-2K", line: "Line C", supervisor: "P. Kimani", due: "2026-05-23" },
  { id: "PO-2026-0185", product: "Mango Juice 500ml", recipeCode: "REC-MJ-500", line: "Line A", supervisor: "L. Achieng", due: "2026-05-24" },
  { id: "PO-2026-0186", product: "Pasteurized Milk 1L", recipeCode: "REC-PM-1L", line: "Line B", supervisor: "S. Mutua", due: "2026-05-24" },
];

function seedActive(): ActiveBatch[] {
  const r1 = RECIPES.find((r) => r.code === "REC-MJ-500")!;
  const r2 = RECIPES.find((r) => r.code === "REC-MF-2K")!;
  return [
    {
      batchId: "PB-2026-0452",
      order: { id: "PO-2026-0180", product: "Mango Juice 500ml", recipeCode: "REC-MJ-500", line: "Line A", supervisor: "J. Otieno", due: "2026-05-21" },
      recipe: r1,
      startedAt: "2026-05-22 08:00",
      stepState: Object.fromEntries(
        r1.steps.map((s, i) => [s.id, i < 4 ? { done: true, value: i === 2 ? "4,420" : "" } : { done: false, value: "" }]),
      ),
    },
    {
      batchId: "PB-2026-0453",
      order: { id: "PO-2026-0181", product: "Maize Flour 2kg", recipeCode: "REC-MF-2K", line: "Line C", supervisor: "P. Kimani", due: "2026-05-22" },
      recipe: r2,
      startedAt: "2026-05-22 09:15",
      stepState: Object.fromEntries(
        r2.steps.map((s, i) => [s.id, i < 1 ? { done: true, value: "" } : { done: false, value: "" }]),
      ),
    },
  ];
}

interface State {
  orders: ProductionOrder[];
  active: ActiveBatch[];
  completed: typeof productionBatches;
}

let state: State = {
  orders: INITIAL_ORDERS,
  active: seedActive(),
  completed: productionBatches,
};

const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());
const set = (next: State) => {
  state = next;
  emit();
};

export const getState = () => state;

export function getActiveBatch(batchId: string) {
  return state.active.find((b) => b.batchId === batchId) ?? null;
}

function nextBatchId() {
  const n = 452 + Math.floor(Math.random() * 90);
  return `PB-2026-0${n}`;
}

export function startBatch(order: ProductionOrder): ActiveBatch | null {
  const recipe = RECIPES.find((r) => r.code === order.recipeCode);
  if (!recipe) return null;
  const batch: ActiveBatch = {
    batchId: nextBatchId(),
    order,
    recipe,
    startedAt: new Date().toLocaleString(),
    stepState: Object.fromEntries(recipe.steps.map((s) => [s.id, { done: false, value: "" }])),
  };
  set({
    ...state,
    orders: state.orders.filter((o) => o.id !== order.id),
    active: [batch, ...state.active],
  });
  return batch;
}

export function updateStep(batchId: string, stepId: string, patch: { done?: boolean; value?: string }) {
  set({
    ...state,
    active: state.active.map((b) =>
      b.batchId === batchId
        ? { ...b, stepState: { ...b.stepState, [stepId]: { ...b.stepState[stepId], ...patch } } }
        : b,
    ),
  });
}

export function completeBatch(batchId: string) {
  const batch = state.active.find((b) => b.batchId === batchId);
  if (!batch) return;
  const yieldStep = [...batch.recipe.steps].reverse().find((s) => s.kind === "input" && /yield|volume/i.test(s.title));
  const yieldValue = yieldStep ? `${batch.stepState[yieldStep.id]?.value ?? ""} ${yieldStep.unit ?? ""}`.trim() : "—";
  set({
    ...state,
    active: state.active.filter((b) => b.batchId !== batchId),
    completed: [
      {
        id: batch.batchId,
        product: batch.order.product,
        recipe: batch.recipe.version,
        line: batch.order.line,
        supervisor: batch.order.supervisor,
        start: batch.startedAt,
        end: new Date().toLocaleString(),
        yield: yieldValue || "—",
        waste: "—",
        status: "Released",
      },
      ...state.completed,
    ],
  });
}

export function useBatchesState() {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => state,
    () => state,
  );
}