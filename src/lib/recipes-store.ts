import { useSyncExternalStore } from "react";

export type StepKind = "check" | "input";

export interface Ingredient {
  id: string;
  name: string;
  quantity: string;
  unit: string;
}

export interface ProcessStep {
  id: string;
  title: string;
  detail: string;
  kind: StepKind;
  unit?: string;
  expected?: string;
}

export interface Recipe extends Record<string, unknown> {
  code: string;
  product: string;
  version: string;
  yield: string;
  shelf: string;
  status: string;
  ingredients: Ingredient[];
  steps: ProcessStep[];
}

export const uid = () => Math.random().toString(36).slice(2, 9);

export function emptyRecipe(): Recipe {
  return {
    code: "",
    product: "",
    version: "v1.0",
    yield: "",
    shelf: "",
    status: "Pending",
    ingredients: [{ id: uid(), name: "", quantity: "", unit: "kg" }],
    steps: [{ id: uid(), title: "", detail: "", kind: "check" }],
  };
}

let recipes: Recipe[] = [
  {
    code: "REC-MJ-500",
    product: "Mango Juice 500ml",
    version: "v2.1",
    yield: "4,800 L / batch",
    shelf: "180 days",
    status: "Approved",
    ingredients: [
      { id: "i1", name: "Mango pulp", quantity: "620", unit: "kg" },
      { id: "i2", name: "Water", quantity: "3,800", unit: "L" },
      { id: "i3", name: "Sugar", quantity: "420", unit: "kg" },
      { id: "i4", name: "Citric acid", quantity: "4.2", unit: "kg" },
      { id: "i5", name: "Ascorbic acid", quantity: "0.8", unit: "kg" },
    ],
    steps: [
      { id: "s1", title: "Blend pulp + water", detail: "15 min @ 1200 rpm", kind: "input", unit: "L", expected: "≈ 4,420" },
      { id: "s2", title: "Add sugar & acids", detail: "Mix 10 min until dissolved", kind: "check" },
      { id: "s3", title: "Pasteurize", detail: "85 °C × 15 s", kind: "input", unit: "°C", expected: "85" },
      { id: "s4", title: "Cool to 25 °C", detail: "Transfer to packaging", kind: "check" },
    ],
  },
  {
    code: "REC-PM-1L",
    product: "Pasteurized Milk 1L",
    version: "v3.0",
    yield: "2,400 L / batch",
    shelf: "14 days",
    status: "Approved",
    ingredients: [{ id: "i1", name: "Raw milk", quantity: "2,500", unit: "L" }],
    steps: [
      { id: "s1", title: "Standardize fat", detail: "Adjust to 3.25%", kind: "check" },
      { id: "s2", title: "Pasteurize HTST", detail: "72 °C × 15 s", kind: "input", unit: "°C", expected: "72" },
      { id: "s3", title: "Homogenize", detail: "Two-stage", kind: "check" },
      { id: "s4", title: "Cool & store", detail: "Cool to 4 °C", kind: "check" },
    ],
  },
  {
    code: "REC-MF-2K",
    product: "Maize Flour 2kg",
    version: "v1.4",
    yield: "7,800 kg / batch",
    shelf: "365 days",
    status: "Approved",
    ingredients: [{ id: "i1", name: "Maize grain", quantity: "10,000", unit: "kg" }],
    steps: [
      { id: "s1", title: "Clean grain", detail: "Remove stones & dust", kind: "check" },
      { id: "s2", title: "Condition with water", detail: "Rest 12 h", kind: "check" },
      { id: "s3", title: "Mill & sift", detail: "Record extraction rate", kind: "input", unit: "%", expected: "78" },
    ],
  },
  {
    code: "REC-YG-250",
    product: "Yoghurt 250ml",
    version: "v1.0",
    yield: "1,200 L / batch",
    shelf: "21 days",
    status: "Pending",
    ingredients: [
      { id: "i1", name: "Milk", quantity: "1,200", unit: "L" },
      { id: "i2", name: "Starter culture", quantity: "1.2", unit: "kg" },
      { id: "i3", name: "Sugar", quantity: "80", unit: "kg" },
    ],
    steps: [
      { id: "s1", title: "Heat milk", detail: "Heat to 90 °C × 5 min", kind: "input", unit: "°C", expected: "90" },
      { id: "s2", title: "Cool & inoculate", detail: "Cool to 43 °C, add culture", kind: "check" },
      { id: "s3", title: "Incubate", detail: "Hold 4–6 h until pH 4.5", kind: "input", unit: "pH", expected: "4.5" },
    ],
  },
];

const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export function getRecipes() {
  return recipes;
}

export function getRecipe(code: string) {
  return recipes.find((r) => r.code === code) ?? null;
}

export function upsertRecipe(next: Recipe, originalCode?: string | null) {
  if (originalCode) {
    recipes = recipes.map((r) => (r.code === originalCode ? next : r));
  } else if (!recipes.some((r) => r.code === next.code)) {
    recipes = [...recipes, next];
  }
  emit();
}

export function deleteRecipe(code: string) {
  recipes = recipes.filter((r) => r.code !== code);
  emit();
}

export function useRecipes() {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => recipes,
    () => recipes,
  );
}