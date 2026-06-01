import type { ReactNode } from "react";

export type WorkflowStepKey =
  | "supplier"
  | "raw-material"
  | "storage-intake"
  | "quality-check"
  | "recipe-select"
  | "production-batch"
  | "packaging"
  | "finished-good"
  | "dispatch";

export type WorkflowStep = {
  key: WorkflowStepKey;
  title: string;
  module: string;
  description: string;
};

export type WorkflowTemplate = {
  id: string;
  name: string;
  description: string;
  category: "Inbound" | "Production" | "Outbound";
  steps: WorkflowStepKey[];
};

export type AssignedWorkflow = {
  id: string;
  templateId: string;
  assignee: string;
  reference: string;
  status: "queued" | "in-progress" | "completed";
  currentStep: number;
  createdAt: string;
  notes?: string;
};

export const STEP_LIBRARY: Record<WorkflowStepKey, WorkflowStep> = {
  supplier: {
    key: "supplier",
    title: "Select / Add Supplier",
    module: "Suppliers",
    description: "Pick the supplier delivering the goods, or register a new one.",
  },
  "raw-material": {
    key: "raw-material",
    title: "Select Raw Material",
    module: "Raw Materials",
    description: "Choose the catalog raw material that is being received.",
  },
  "storage-intake": {
    key: "storage-intake",
    title: "Storage Intake",
    module: "Storage",
    description: "Record quantity, lot, dates and assign to a storage location.",
  },
  "quality-check": {
    key: "quality-check",
    title: "Quality Check",
    module: "Quality Control",
    description: "Run the QC checklist and capture pass/fail with notes.",
  },
  "recipe-select": {
    key: "recipe-select",
    title: "Choose Recipe",
    module: "Recipes / BOM",
    description: "Select the recipe / bill of materials for this run.",
  },
  "production-batch": {
    key: "production-batch",
    title: "Production Batch",
    module: "Production Batches",
    description: "Open a batch, consume raw materials and record yield.",
  },
  packaging: {
    key: "packaging",
    title: "Packaging",
    module: "Packaging",
    description: "Pack the batch into SKUs and assign packaging lots.",
  },
  "finished-good": {
    key: "finished-good",
    title: "Finished Good",
    module: "Finished Goods",
    description: "Move the packed product into the finished goods store.",
  },
  dispatch: {
    key: "dispatch",
    title: "Dispatch",
    module: "Dispatch",
    description: "Allocate to an order and prepare for shipment.",
  },
};

export const WORKFLOW_TEMPLATES: WorkflowTemplate[] = [
  {
    id: "wf-inbound-receiving",
    name: "Inbound Receiving",
    description: "Receive raw materials from a supplier and update storage.",
    category: "Inbound",
    steps: ["supplier", "raw-material", "quality-check", "storage-intake"],
  },
  {
    id: "wf-production-run",
    name: "Production Run",
    description: "Run production from recipe to finished goods.",
    category: "Production",
    steps: ["recipe-select", "production-batch", "packaging", "finished-good"],
  },
  {
    id: "wf-quick-intake",
    name: "Quick Supplier Intake",
    description: "Light-weight intake for trusted suppliers (no QC).",
    category: "Inbound",
    steps: ["supplier", "raw-material", "storage-intake"],
  },
];

export const ASSIGNED_WORKFLOWS: AssignedWorkflow[] = [
  {
    id: "WF-2026-0016",
    templateId: "wf-inbound-receiving",
    assignee: "You",
    reference: "Green Valley — DN-2026-0021",
    status: "in-progress",
    currentStep: 2,
    createdAt: "2026-05-21 14:20",
  },
  {
    id: "WF-2026-0014",
    templateId: "wf-inbound-receiving",
    assignee: "You",
    reference: "Sunrise Dairy — DN-2026-0019",
    status: "queued",
    currentStep: 0,
    createdAt: "2026-05-22 08:10",
  },
  {
    id: "WF-2026-0015",
    templateId: "wf-production-run",
    assignee: "You",
    reference: "Mango Nectar 1L — Plan #PR-114",
    status: "queued",
    currentStep: 0,
    createdAt: "2026-05-22 09:00",
  },
  {
    id: "WF-2026-0012",
    templateId: "wf-quick-intake",
    assignee: "Aisha M.",
    reference: "PackRight — DN-2026-0017",
    status: "in-progress",
    currentStep: 1,
    createdAt: "2026-05-21 16:42",
  },
  {
    id: "WF-2026-0017",
    templateId: "wf-quick-intake",
    assignee: "Unassigned",
    reference: "Coast Fruits — DN-2026-0023",
    status: "queued",
    currentStep: 0,
    createdAt: "2026-05-22 10:05",
  },
  {
    id: "WF-2026-0018",
    templateId: "wf-production-run",
    assignee: "Unassigned",
    reference: "Yoghurt 500ml — Plan #PR-118",
    status: "queued",
    currentStep: 0,
    createdAt: "2026-05-22 10:30",
  },
];

export function templateById(id: string): WorkflowTemplate | undefined {
  return WORKFLOW_TEMPLATES.find((t) => t.id === id);
}

export type StepFormProps = {
  values: Record<string, string>;
  onChange: (key: string, value: string) => void;
};

export type StepRenderer = (props: StepFormProps) => ReactNode;
