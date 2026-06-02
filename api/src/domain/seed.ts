import { sql } from "drizzle-orm";
import {
  db,
  suppliers,
  rawMaterials,
  productionBatches,
  finishedGoods,
  dispatches,
  recalls,
  qcChecks,
  wasteRecords,
  returns,
  recipes,
  productionOrders,
  packagingRuns,
  workflowTemplates,
  workflowInstances,
  companyConfig,
} from "./schema";

// ── inline mock data (mirrors src/lib/mock-data.ts; do not import frontend) ──
const suppliersData = [
  { id: "SUP-001", name: "Green Valley Farms", location: "Nakuru, KE", materials: "Maize, Wheat", status: "Approved", risk: "Low", cert: "Valid", rejection: "2%" },
  { id: "SUP-002", name: "Sunrise Dairy Coop", location: "Eldoret, KE", materials: "Raw Milk", status: "Approved", risk: "Low", cert: "Valid", rejection: "1%" },
  { id: "SUP-003", name: "Mwea Rice Growers", location: "Kirinyaga, KE", materials: "Paddy Rice", status: "Pending", risk: "Medium", cert: "Expiring", rejection: "5%" },
  { id: "SUP-004", name: "Coast Fruits Ltd", location: "Mombasa, KE", materials: "Mango, Pineapple", status: "Approved", risk: "Low", cert: "Valid", rejection: "3%" },
  { id: "SUP-005", name: "PackRight Industries", location: "Nairobi, KE", materials: "PET Bottles, Caps", status: "Approved", risk: "Low", cert: "Valid", rejection: "0%" },
  { id: "SUP-006", name: "AgroChem Suppliers", location: "Thika, KE", materials: "Citric Acid, Sugar", status: "Quarantined", risk: "High", cert: "Expired", rejection: "12%" },
];

const rawMaterialsData = [
  { id: "RM-2024-1001", material: "Raw Milk", supplier: "Sunrise Dairy Coop", lot: "SDC-9921", qty: "2,400 L", received: "2026-05-19", expiry: "2026-05-22", status: "Approved", location: "Cold Room A" },
  { id: "RM-2024-1002", material: "Maize Grain", supplier: "Green Valley Farms", lot: "GVF-4412", qty: "8,000 kg", received: "2026-05-18", expiry: "2026-11-18", status: "Approved", location: "Silo 2" },
  { id: "RM-2024-1003", material: "Mango Pulp", supplier: "Coast Fruits Ltd", lot: "CFL-228", qty: "1,200 kg", received: "2026-05-19", expiry: "2026-08-19", status: "Pending QC", location: "Receiving Bay" },
  { id: "RM-2024-1004", material: "Sugar", supplier: "AgroChem Suppliers", lot: "ACS-771", qty: "500 kg", received: "2026-05-17", expiry: "2027-05-17", status: "Quarantined", location: "Quarantine Store" },
  { id: "RM-2024-1005", material: "PET Bottles 500ml", supplier: "PackRight Industries", lot: "PRI-5520", qty: "12,000 pcs", received: "2026-05-16", expiry: "—", status: "Approved", location: "Packaging Store" },
];

const productionBatchesData = [
  { id: "PB-2026-0451", product: "Mango Juice 500ml", recipe: "v2.1", line: "Line A", supervisor: "J. Otieno", start: "2026-05-19 08:00", end: "2026-05-19 14:00", yield: "4,800 L", waste: "120 L", status: "In Process" },
  { id: "PB-2026-0450", product: "Pasteurized Milk 1L", recipe: "v3.0", line: "Line B", supervisor: "M. Wanjiku", start: "2026-05-19 06:00", end: "2026-05-19 11:30", yield: "2,350 L", waste: "50 L", status: "Packaging" },
  { id: "PB-2026-0449", product: "Maize Flour 2kg", recipe: "v1.4", line: "Line C", supervisor: "P. Kimani", start: "2026-05-18 07:00", end: "2026-05-18 16:00", yield: "7,600 kg", waste: "180 kg", status: "Released" },
  { id: "PB-2026-0448", product: "Pineapple Juice 1L", recipe: "v2.0", line: "Line A", supervisor: "J. Otieno", start: "2026-05-18 13:00", end: "2026-05-18 19:00", yield: "3,100 L", waste: "210 L", status: "Quarantined" },
];

const finishedGoodsData = [
  { id: "FG-2026-0991", product: "Mango Juice 500ml", batch: "PB-2026-0451", qty: "9,400 units", location: "FG Warehouse 1", mfg: "2026-05-19", expiry: "2026-11-19", status: "Pending QC" },
  { id: "FG-2026-0990", product: "Pasteurized Milk 1L", batch: "PB-2026-0450", qty: "2,300 units", location: "Cold Room B", mfg: "2026-05-19", expiry: "2026-06-02", status: "Released" },
  { id: "FG-2026-0989", product: "Maize Flour 2kg", batch: "PB-2026-0449", qty: "3,800 units", location: "FG Warehouse 2", mfg: "2026-05-18", expiry: "2027-05-18", status: "Released" },
  { id: "FG-2026-0988", product: "Pineapple Juice 1L", batch: "PB-2026-0448", qty: "3,050 units", location: "FG Warehouse 1", mfg: "2026-05-18", expiry: "2026-11-18", status: "Quarantined" },
];

const dispatchesData = [
  { id: "DSP-7782", customer: "Naivas Supermarkets", product: "Maize Flour 2kg", qty: "1,200 units", vehicle: "KCA 442X", driver: "Samuel N.", destination: "Nairobi DC", status: "Delivered", date: "2026-05-19" },
  { id: "DSP-7781", customer: "Carrefour Kenya", product: "Pasteurized Milk 1L", qty: "800 units", vehicle: "KDB 119Y", driver: "Esther A.", destination: "Westgate", status: "In Transit", date: "2026-05-19" },
  { id: "DSP-7780", customer: "QuickMart", product: "Mango Juice 500ml", qty: "2,400 units", vehicle: "KBN 778Z", driver: "Daniel K.", destination: "Mombasa", status: "Dispatched", date: "2026-05-19" },
];

const recallsData = [
  { id: "RC-2026-007", product: "Pineapple Juice 1L", batch: "PB-2026-0448", reason: "QC failure — Brix out of range", produced: "3,050 units", dispatched: "0", recovered: "0", status: "Open", opened: "2026-05-19" },
  { id: "RC-2026-006", product: "Yoghurt 250ml", batch: "PB-2026-0431", reason: "Customer complaint — seal", produced: "5,200 units", dispatched: "4,800", recovered: "3,920", status: "In Progress", opened: "2026-05-12" },
  { id: "RC-2026-005", product: "Maize Flour 2kg", batch: "PB-2026-0402", reason: "Foreign material risk", produced: "8,000 units", dispatched: "7,600", recovered: "7,600", status: "Closed", opened: "2026-04-28" },
];

const qcChecksData = [
  { id: "QC-5582", batch: "PB-2026-0451", checkpoint: "Pasteurization Temp", value: "85°C", limit: "82–88°C", inspector: "L. Mutua", time: "2026-05-19 09:15", status: "Pass" },
  { id: "QC-5581", batch: "PB-2026-0451", checkpoint: "Brix Level", value: "12.4", limit: "12–14", inspector: "L. Mutua", time: "2026-05-19 10:00", status: "Pass" },
  { id: "QC-5580", batch: "PB-2026-0448", checkpoint: "Brix Level", value: "9.8", limit: "12–14", inspector: "A. Njoroge", time: "2026-05-18 15:20", status: "Fail" },
  { id: "QC-5579", batch: "PB-2026-0450", checkpoint: "Fat Content", value: "3.5%", limit: "3.2–3.8%", inspector: "L. Mutua", time: "2026-05-19 07:40", status: "Pass" },
];

const wasteRecordsData = [
  { id: "WST-331", source: "PB-2026-0451", material: "Mango Pulp", qty: "120 L", reason: "Overflow", disposal: "Composting", date: "2026-05-19", status: "Approved" },
  { id: "WST-330", source: "RM-2024-1004", material: "Sugar", qty: "500 kg", reason: "Failed QC", disposal: "Return to supplier", date: "2026-05-17", status: "Pending" },
  { id: "WST-329", source: "PB-2026-0449", material: "Maize Flour", qty: "180 kg", reason: "Line spillage", disposal: "Animal feed", date: "2026-05-18", status: "Approved" },
];

const returnsData = [
  { id: "RET-221", customer: "Naivas Supermarkets", product: "Maize Flour 2kg", batch: "PB-2026-0440", qty: "24 units", reason: "Damaged packaging", decision: "Destroy", date: "2026-05-18" },
  { id: "RET-220", customer: "QuickMart", product: "Mango Juice 500ml", batch: "PB-2026-0445", qty: "12 units", reason: "Near expiry", decision: "Investigate", date: "2026-05-17" },
];

// ── recipes (mirrors src/lib/recipes-store.ts RECIPES; ingredients/steps jsonb) ──
const recipesData = [
  {
    code: "REC-MJ-500",
    product: "Mango Juice 500ml",
    yield: "4,800 L / batch",
    version: "v2.1",
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
    yield: "2,400 L / batch",
    version: "v3.0",
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
    yield: "7,800 kg / batch",
    version: "v1.4",
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
    yield: "1,200 L / batch",
    version: "v1.0",
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

// ── production_orders (mirrors batches-store.ts INITIAL_ORDERS) ──
const productionOrdersData = [
  { id: "PO-2026-0182", product: "Mango Juice 500ml", recipeCode: "REC-MJ-500", line: "Line A", supervisor: "J. Otieno", due: "2026-05-22", status: "Planned" },
  { id: "PO-2026-0183", product: "Pasteurized Milk 1L", recipeCode: "REC-PM-1L", line: "Line B", supervisor: "M. Wanjiku", due: "2026-05-22", status: "Planned" },
  { id: "PO-2026-0184", product: "Maize Flour 2kg", recipeCode: "REC-MF-2K", line: "Line C", supervisor: "P. Kimani", due: "2026-05-23", status: "Planned" },
  { id: "PO-2026-0185", product: "Mango Juice 500ml", recipeCode: "REC-MJ-500", line: "Line A", supervisor: "L. Achieng", due: "2026-05-24", status: "Planned" },
  { id: "PO-2026-0186", product: "Pasteurized Milk 1L", recipeCode: "REC-PM-1L", line: "Line B", supervisor: "S. Mutua", due: "2026-05-24", status: "Planned" },
];

// ── packaging_runs (mirrors packaging-store.ts seed; boxes/products tree jsonb) ──
function buildBoxes(n: number, boxCount: number, productsPerBox: number) {
  return Array.from({ length: boxCount }).map((_, bi) => ({
    id: `BX-${n}-${bi + 1}`,
    code: `BX-${n}-${String(bi + 1).padStart(3, "0")}`,
    products: Array.from({ length: productsPerBox }).map((__, pi) => ({
      id: `PD-${n}-${bi + 1}-${pi + 1}`,
      code: `PD-${n}-${String(bi + 1).padStart(3, "0")}-${String(pi + 1).padStart(3, "0")}`,
    })),
  }));
}

const packagingRunsData = [
  { id: "PR-3320", code: "PR-3320", batch: "PB-2026-0451", product: "Mango Juice 500ml", packaging: "PET 500ml + cap", mfg: "2026-05-19", expiry: "2026-11-19", status: "Pending QC", boxes: buildBoxes(3320, 3, 6) },
  { id: "PR-3318", code: "PR-3318", batch: "PB-2026-0449", product: "Pineapple Juice 1L", packaging: "TetraPak 1L", mfg: "2026-05-15", expiry: "2026-11-15", status: "Ready for dispatch", boxes: buildBoxes(3318, 5, 8) },
  { id: "PR-3315", code: "PR-3315", batch: "PB-2026-0446", product: "Orange Nectar 250ml", packaging: "TetraPak 250ml", mfg: "2026-05-10", expiry: "2026-11-10", status: "Dispatched", boxes: buildBoxes(3315, 8, 24) },
  { id: "PR-3312", code: "PR-3312", batch: "PB-2026-0443", product: "Dried Mango Slices 2kg", packaging: "Paper bag 2kg", mfg: "2026-05-05", expiry: "2027-05-05", status: "Dispatched", boxes: buildBoxes(3312, 2, 4) },
];

// ── workflow_templates (mirrors workflows.ts WORKFLOW_TEMPLATES) ──
const workflowTemplatesData = [
  { id: "wf-inbound-receiving", name: "Inbound Receiving", description: "Receive raw materials from a supplier and update storage.", category: "Inbound", steps: ["supplier", "raw-material", "quality-check", "storage-intake"] },
  { id: "wf-production-run", name: "Production Run", description: "Run production from recipe to finished goods.", category: "Production", steps: ["recipe-select", "production-batch", "packaging", "finished-good"] },
  { id: "wf-quick-intake", name: "Quick Supplier Intake", description: "Light-weight intake for trusted suppliers (no QC).", category: "Inbound", steps: ["supplier", "raw-material", "storage-intake"] },
];

// ── workflow_instances (mirrors workflows.ts ASSIGNED_WORKFLOWS) ──
const workflowInstancesData = [
  { id: "WF-2026-0016", templateId: "wf-inbound-receiving", assignee: "You", reference: "Green Valley — DN-2026-0021", status: "in-progress", currentStep: 2, stepData: {} },
  { id: "WF-2026-0014", templateId: "wf-inbound-receiving", assignee: "You", reference: "Sunrise Dairy — DN-2026-0019", status: "queued", currentStep: 0, stepData: {} },
  { id: "WF-2026-0015", templateId: "wf-production-run", assignee: "You", reference: "Mango Nectar 1L — Plan #PR-114", status: "queued", currentStep: 0, stepData: {} },
  { id: "WF-2026-0012", templateId: "wf-quick-intake", assignee: "Aisha M.", reference: "PackRight — DN-2026-0017", status: "in-progress", currentStep: 1, stepData: {} },
  { id: "WF-2026-0017", templateId: "wf-quick-intake", assignee: "Unassigned", reference: "Coast Fruits — DN-2026-0023", status: "queued", currentStep: 0, stepData: {} },
  { id: "WF-2026-0018", templateId: "wf-production-run", assignee: "Unassigned", reference: "Yoghurt 500ml — Plan #PR-118", status: "queued", currentStep: 0, stepData: {} },
];

// ── company_config (single row; mirrors src/routes/company.tsx sections defaults) ──
const companyConfigData = {
  sections: [
    {
      title: "Company profile",
      desc: "Legal name, registration, VAT, contact details.",
      updated: "2026-05-12",
      owner: "P. Kimani (Plant Manager)",
      fields: [
        { label: "Legal name", value: "AgroTrace Processing Ltd" },
        { label: "Registration No.", value: "PVT-KE-2018-44219" },
        { label: "VAT / PIN", value: "P051298733M" },
        { label: "Head office", value: "Industrial Area, Nairobi, KE" },
        { label: "Primary contact", value: "+254 711 220 884" },
        { label: "Email", value: "ops@agrotrace.co.ke" },
      ],
    },
    {
      title: "Factory & site locations",
      desc: "Mwea Processing Plant, Eldoret Dairy, Nairobi DC.",
      updated: "2026-05-04",
      owner: "Ops Team",
      fields: [
        { label: "Total sites", value: "3" },
        { label: "Active production lines", value: "7" },
      ],
      items: [
        "Mwea Processing Plant — Kirinyaga (3 lines)",
        "Eldoret Dairy — Uasin Gishu (2 lines)",
        "Nairobi Distribution Centre — Industrial Area",
      ],
    },
    {
      title: "Stores, warehouses & cold rooms",
      desc: "12 locations registered.",
      updated: "2026-05-15",
      owner: "Stores Dept.",
      fields: [
        { label: "Ambient stores", value: "6" },
        { label: "Cold rooms", value: "4" },
        { label: "Quarantine bays", value: "2" },
      ],
      items: [
        "Cold Room A — 2 to 4°C",
        "Cold Room B — 0 to 2°C",
        "Silo 2 — Maize, 8,000 kg cap.",
        "Quarantine Store — Restricted access",
      ],
    },
    {
      title: "Departments",
      desc: "Production, QA, Stores, Sales, Maintenance.",
      updated: "2026-04-28",
      owner: "HR",
      fields: [{ label: "Departments", value: "5" }],
      items: ["Production", "Quality Assurance", "Stores & Logistics", "Sales", "Maintenance"],
    },
    {
      title: "Users & roles",
      desc: "47 users across 8 role profiles.",
      updated: "2026-05-18",
      owner: "IT Admin",
      fields: [
        { label: "Active users", value: "47" },
        { label: "Role profiles", value: "8" },
        { label: "Last access review", value: "2026-05-01" },
      ],
      items: [
        "Admin (2)",
        "Plant Manager (1)",
        "QA Manager (2)",
        "QA Officer (6)",
        "Production Supervisor (5)",
        "Stores Clerk (9)",
        "Operator (18)",
        "Viewer (4)",
      ],
    },
    {
      title: "Approval levels",
      desc: "QA Officer → QA Manager → Plant Manager.",
      updated: "2026-03-22",
      owner: "QA",
      fields: [
        { label: "Workflow steps", value: "3" },
        { label: "Escalation SLA", value: "4 hours" },
      ],
      items: [
        "L1 — QA Officer (raw material release)",
        "L2 — QA Manager (batch release, deviations)",
        "L3 — Plant Manager (recalls, write-offs)",
      ],
    },
    {
      title: "Product categories",
      desc: "Beverages, Dairy, Cereals, Snacks.",
      updated: "2026-02-10",
      owner: "Product",
      fields: [{ label: "Categories", value: "4" }, { label: "SKUs", value: "38" }],
      items: ["Beverages (12 SKUs)", "Dairy (9 SKUs)", "Cereals (11 SKUs)", "Snacks (6 SKUs)"],
    },
    {
      title: "Batch numbering rules",
      desc: "PB-{YYYY}-{####} auto-incremented per line.",
      updated: "2026-01-08",
      owner: "Production",
      fields: [
        { label: "Pattern", value: "PB-{YYYY}-{####}" },
        { label: "Reset cycle", value: "Yearly" },
        { label: "Per line counter", value: "Yes" },
      ],
    },
    {
      title: "Label formats",
      desc: "GS1-128, QR with traceability URL, internal RM tag.",
      updated: "2026-04-02",
      owner: "Packaging",
      fields: [
        { label: "Standards", value: "GS1-128, QR" },
        { label: "QR base URL", value: "verify.agrotrace.co.ke" },
      ],
      items: ["Finished goods — GS1-128 + QR", "Raw materials — internal RM tag", "Pallet — SSCC"],
    },
  ],
};

/** Parse the leading number out of a text quantity ("8,000 kg" -> 8000). */
function parseQty(text: string | null | undefined): string | null {
  if (!text) return null;
  const m = text.replace(/,/g, "").match(/-?\d+(\.\d+)?/);
  if (!m) return null;
  const n = Number(m[0]);
  return Number.isFinite(n) ? String(n) : null;
}

/** Returns true when the table has zero rows. */
async function isEmpty(table: any): Promise<boolean> {
  const rows = await db.select({ c: sql<number>`count(*)` }).from(table);
  return Number(rows[0]?.c ?? 0) === 0;
}

export async function seedDomain(): Promise<Record<string, number>> {
  if (await isEmpty(suppliers)) {
    await db.insert(suppliers).values(suppliersData);
  }

  if (await isEmpty(rawMaterials)) {
    await db.insert(rawMaterials).values(rawMaterialsData);
  }

  if (await isEmpty(productionBatches)) {
    await db.insert(productionBatches).values(
      productionBatchesData.map((r) => ({
        id: r.id,
        product: r.product,
        recipe: r.recipe,
        line: r.line,
        supervisor: r.supervisor,
        startAt: r.start,
        endAt: r.end,
        yieldText: r.yield,
        waste: r.waste,
        status: r.status,
        yieldNum: parseQty(r.yield),
        wasteNum: parseQty(r.waste),
      })),
    );
  }

  if (await isEmpty(finishedGoods)) {
    await db.insert(finishedGoods).values(
      finishedGoodsData.map((r) => ({ ...r, qtyNum: parseQty(r.qty) })),
    );
  }

  if (await isEmpty(dispatches)) {
    await db.insert(dispatches).values(
      dispatchesData.map((r) => ({ ...r, qtyNum: parseQty(r.qty) })),
    );
  }

  if (await isEmpty(recalls)) {
    await db.insert(recalls).values(recallsData);
  }

  if (await isEmpty(qcChecks)) {
    await db.insert(qcChecks).values(qcChecksData);
  }

  if (await isEmpty(wasteRecords)) {
    await db.insert(wasteRecords).values(
      wasteRecordsData.map((r) => ({ ...r, qtyNum: parseQty(r.qty) })),
    );
  }

  if (await isEmpty(returns)) {
    await db.insert(returns).values(returnsData);
  }

  // ── new entities (counts returned to caller) ──
  const counts: Record<string, number> = {
    recipes: 0,
    production_orders: 0,
    packaging_runs: 0,
    workflow_templates: 0,
    workflow_instances: 0,
    company_config: 0,
  };

  if (await isEmpty(recipes)) {
    await db.insert(recipes).values(
      recipesData.map((r) => ({
        code: r.code,
        product: r.product,
        version: r.version,
        yieldText: r.yield,
        shelf: r.shelf,
        status: r.status,
        ingredients: r.ingredients,
        steps: r.steps,
      })),
    );
    counts.recipes = recipesData.length;
  }

  if (await isEmpty(productionOrders)) {
    await db.insert(productionOrders).values(
      productionOrdersData.map((r) => ({
        id: r.id,
        product: r.product,
        recipeCode: r.recipeCode,
        line: r.line,
        supervisor: r.supervisor,
        due: r.due,
        status: r.status,
      })),
    );
    counts.production_orders = productionOrdersData.length;
  }

  if (await isEmpty(packagingRuns)) {
    await db.insert(packagingRuns).values(
      packagingRunsData.map((r) => ({
        id: r.id,
        code: r.code,
        batch: r.batch,
        product: r.product,
        packaging: r.packaging,
        mfg: r.mfg,
        expiry: r.expiry,
        status: r.status,
        boxes: r.boxes,
      })),
    );
    counts.packaging_runs = packagingRunsData.length;
  }

  if (await isEmpty(workflowTemplates)) {
    await db.insert(workflowTemplates).values(
      workflowTemplatesData.map((r) => ({
        id: r.id,
        name: r.name,
        description: r.description,
        category: r.category,
        steps: r.steps,
      })),
    );
    counts.workflow_templates = workflowTemplatesData.length;
  }

  if (await isEmpty(workflowInstances)) {
    await db.insert(workflowInstances).values(
      workflowInstancesData.map((r) => ({
        id: r.id,
        templateId: r.templateId,
        assignee: r.assignee,
        reference: r.reference,
        status: r.status,
        currentStep: r.currentStep,
        stepData: r.stepData,
      })),
    );
    counts.workflow_instances = workflowInstancesData.length;
  }

  if (await isEmpty(companyConfig)) {
    await db.insert(companyConfig).values({ id: "default", data: companyConfigData });
    counts.company_config = 1;
  }

  return counts;
}
