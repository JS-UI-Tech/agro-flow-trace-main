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

export async function seedDomain(): Promise<void> {
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
}
