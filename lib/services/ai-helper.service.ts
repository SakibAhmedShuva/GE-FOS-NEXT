import ExcelJS from "exceljs";
import { prisma } from "@/lib/db/prisma";
import type { SessionUser } from "@/lib/auth/session";
import { saveOfferProject, serializeOfferProject } from "@/lib/services/offer-project.service";

const HEADER_KEYWORDS = ["description", "item", "qty", "quantity", "unit", "price", "rate", "amount"];
const FOOTER_KEYWORDS = ["total", "grand total", "signature", "prepared", "authorized", "sub total", "subtotal"];

function cellText(value: unknown) {
  if (value === null || value === undefined) return "";
  if (typeof value === "object" && "text" in value) return String((value as { text?: unknown }).text || "");
  if (typeof value === "object" && "richText" in value) return ((value as { richText?: Array<{ text?: string }> }).richText || []).map((part) => part.text || "").join("");
  return String(value).trim();
}

function detectHeader(rows: string[][]) {
  let bestIndex = 0;
  let bestScore = -1;
  rows.slice(0, 20).forEach((row, index) => {
    const text = row.join(" ").toLowerCase();
    const score = HEADER_KEYWORDS.reduce((sum, keyword) => sum + (text.includes(keyword) ? 1 : 0), 0);
    if (score > bestScore) { bestScore = score; bestIndex = index; }
  });
  return bestIndex;
}

function findColumn(headers: string[], names: string[]) {
  const lowered = headers.map((header) => header.toLowerCase());
  for (const name of names) {
    const exact = lowered.findIndex((header) => header === name);
    if (exact >= 0) return exact;
  }
  for (const name of names) {
    const partial = lowered.findIndex((header) => header.includes(name));
    if (partial >= 0) return partial;
  }
  return -1;
}

function words(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9 ]/g, " ").split(/\s+/).filter((word) => word.length > 2).slice(0, 8);
}

export async function processAiHelperWorkbook(file: File, source: string) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(Buffer.from(await file.arrayBuffer()) as never);
  const worksheet = workbook.worksheets[0];
  if (!worksheet) throw new Error("Workbook has no worksheet");
  const rawRows: string[][] = [];
  worksheet.eachRow((row) => {
    const values: string[] = [];
    row.eachCell({ includeEmpty: true }, (cell, colNumber) => { values[colNumber - 1] = cellText(cell.value); });
    rawRows.push(values);
  });
  const headerRowIndex = detectHeader(rawRows);
  const headers = rawRows[headerRowIndex] || [];
  const descriptionColumn = findColumn(headers, ["description", "item description", "item", "material", "particulars"]);
  const qtyColumn = findColumn(headers, ["qty", "quantity"]);
  const unitColumn = findColumn(headers, ["unit", "uom"]);
  const unitPriceColumn = findColumn(headers, ["unit price", "rate", "price"]);
  const sourceType = source === "local" ? "LOCAL" : source === "foreign" ? "FOREIGN" : undefined;

  const rows = [];
  for (const [rowIndex, row] of rawRows.slice(headerRowIndex + 1).entries()) {
    const description = descriptionColumn >= 0 ? row[descriptionColumn] || "" : row.find(Boolean) || "";
    const footer = FOOTER_KEYWORDS.some((keyword) => description.toLowerCase().includes(keyword));
    if (!description || footer) continue;
    const queryWords = words(description);
    const suggestions = queryWords.length ? await prisma.catalogItem.findMany({
      where: { ...(sourceType ? { sourceType } : {}), AND: queryWords.slice(0, 4).map((term) => ({ searchText: { contains: term } })) },
      take: 5,
      select: { id: true, sourceType: true, itemCode: true, productType: true, make: true, model: true, approvals: true, descriptionPlain: true, offerPrice: true, poPrice: true, installationPrice: true, unit: true },
    }) : [];
    rows.push({ rowNumber: headerRowIndex + rowIndex + 2, original: row, description, qty: qtyColumn >= 0 ? row[qtyColumn] || "" : "", unit: unitColumn >= 0 ? row[unitColumn] || "" : "", unitPrice: unitPriceColumn >= 0 ? row[unitPriceColumn] || "" : "", suggestions });
  }
  return { worksheetName: worksheet.name, headerRowIndex: headerRowIndex + 1, columns: { descriptionColumn, qtyColumn, unitColumn, unitPriceColumn }, rows };
}

export async function saveAiHelperProject(user: SessionUser, payload: Record<string, unknown>) {
  const project = await prisma.project.create({ data: { referenceNumber: String(payload.referenceNumber || `AI-${Date.now()}`), projectType: "AI_HELPER", ownerUserId: user.id, legacyJson: payload as never, metadata: { aiHelper: payload } as never, lastModifiedAt: new Date() } });
  await prisma.activityLog.create({ data: { actorUserId: user.id, actorNameSnapshot: user.name, action: "ai_helper_project_saved", entityType: "project", entityId: project.id, projectId: project.id, referenceNumber: project.referenceNumber } });
  return project;
}

export async function convertAiRowsToOffer(user: SessionUser, payload: { referenceNumber?: string; clientSnapshot?: Record<string, unknown>; rows: Array<any> }) {
  const items = payload.rows.map((row) => {
    const match = row.selectedSuggestion || row.suggestions?.[0] || {};
    const sourceType = match.sourceType || "CUSTOM";
    const qty = row.qty || "1";
    return { sourceType, catalogItemId: match.id || null, itemCode: match.itemCode || "", productType: match.productType || "", make: match.make || "", model: match.model || "", approvals: match.approvals || "", descriptionPlain: match.descriptionPlain || row.description || "", descriptionHtml: match.descriptionPlain || row.description || "", qty, unit: row.unit || match.unit || "Pcs", foreignPriceUsd: sourceType === "FOREIGN" ? String(match.offerPrice || row.unitPrice || "") : "", localSupplyPriceBdt: sourceType === "LOCAL" ? String(match.offerPrice || row.unitPrice || "") : "", installationPriceBdt: String(match.installationPrice || ""), poPriceUsd: String(match.poPrice || ""), poPriceBdt: "", metadata: { aiHelperRow: row } };
  });
  const project = await saveOfferProject({ user, input: { referenceNumber: payload.referenceNumber || `FO-${Date.now()}`, status: "PENDING", clientSnapshot: payload.clientSnapshot || {}, items, settings: { financials: {}, visibleColumns: {}, tncState: {}, includeSignature: false } } as never });
  if (!project) throw new Error("Offer conversion failed");
  return serializeOfferProject(project);
}
