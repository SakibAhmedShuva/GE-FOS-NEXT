import ExcelJS from "exceljs";
import type { buildOfferDocumentModel } from "@/lib/document-generation/offer-document";
import { money } from "@/lib/document-generation/basic-pdf";

type OfferDocumentModel = ReturnType<typeof buildOfferDocumentModel>;
type OfferItem = OfferDocumentModel["items"][number];

type ColumnDef = { key: string; label: string; width: number; render: (item: OfferItem) => string | number };

function stripHtml(value: unknown) {
  return String(value ?? "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<\/li>/gi, "\n")
    .replace(/<li[^>]*>/gi, "• ")
    .replace(/<[^>]*>/g, " ")
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .trim();
}

function visibleMap(model: OfferDocumentModel) {
  return (model.visibleColumns || {}) as Record<string, unknown>;
}

function isVisible(model: OfferDocumentModel, aliases: string[], fallback = true) {
  const visible = visibleMap(model);
  const existing = aliases.filter((key) => Object.prototype.hasOwnProperty.call(visible, key));
  if (!existing.length) return fallback;
  return existing.some((key) => visible[key] !== false);
}

function canShowPoColumns(model: OfferDocumentModel) {
  const explicit = (model as unknown as { canShowPoColumns?: boolean }).canShowPoColumns;
  if (typeof explicit === "boolean") return explicit;
  const settingsExplicit = (model.settings as unknown as { canShowPoColumns?: boolean }).canShowPoColumns;
  if (typeof settingsExplicit === "boolean") return settingsExplicit;
  const role = (model as unknown as { userRole?: string; exporterRole?: string; user?: { role?: string } }).userRole
    || (model as unknown as { exporterRole?: string }).exporterRole
    || (model as unknown as { user?: { role?: string } }).user?.role;
  return role === "admin" || role === "ADMIN";
}

function offerColumns(model: OfferDocumentModel): ColumnDef[] {
  const columns: ColumnDef[] = [
    { key: "sl", label: "SL", width: 8, render: (item) => item.serial },
    { key: "description", label: "DESCRIPTION", width: 65, render: (item) => stripHtml(item.description) },
    { key: "qty", label: "QTY", width: 10, render: (item) => Number(item.qty || 0) },
    { key: "unit", label: "UNIT", width: 12, render: (item) => item.unit || "Pcs" },
  ];
  if (isVisible(model, ["foreign_price", "foreignPrice", "foreign", "showForeignPrice", "foreignPriceUsd"], true)) {
    columns.push(
      { key: "foreign_price_usd", label: "PRICE (USD)", width: 16, render: (item) => Number(item.foreignPriceUsd || 0) },
      { key: "foreign_total_usd", label: "TOTAL (USD)", width: 16, render: (item) => Number(item.foreignTotalUsd || 0) },
    );
  }
  if (canShowPoColumns(model) && isVisible(model, ["po_price", "po", "showPo", "poPriceUsd"], false)) {
    columns.push(
      { key: "po_price_usd", label: "PO PRICE (USD)", width: 16, render: (item) => Number(item.poPriceUsd || 0) },
      { key: "po_total_usd", label: "PO TOTAL (USD)", width: 16, render: (item) => Number(item.poTotalUsd || 0) },
    );
  }
  if (isVisible(model, ["local_supply_price", "localSupply", "local", "showLocalSupply", "localSupplyPriceBdt"], false)) {
    columns.push(
      { key: "local_supply_price_bdt", label: "PRICE (BDT)", width: 16, render: (item) => Number(item.localSupplyPriceBdt || 0) },
      { key: "local_supply_total_bdt", label: "TOTAL (BDT)", width: 16, render: (item) => Number(item.localSupplyTotalBdt || 0) },
    );
  }
  if (isVisible(model, ["installation_price", "installation", "install", "showInstallation", "installationPriceBdt"], false)) {
    columns.push(
      { key: "installation_price_bdt", label: "PRICE (BDT)", width: 16, render: (item) => Number(item.installationPriceBdt || 0) },
      { key: "installation_total_bdt", label: "TOTAL (BDT)", width: 16, render: (item) => Number(item.installationTotalBdt || 0) },
    );
  }
  return columns;
}

function applyBorder(cell: ExcelJS.Cell) {
  cell.border = { top: { style: "thin" }, left: { style: "thin" }, bottom: { style: "thin" }, right: { style: "thin" } };
}

function addOfferSheet(workbook: ExcelJS.Workbook, model: OfferDocumentModel) {
  const columns = offerColumns(model);
  const sheet = workbook.addWorksheet("Bill of Quantities", { pageSetup: { paperSize: 9, orientation: "landscape", fitToPage: true, fitToWidth: 1, fitToHeight: 0 } });
  const headerFill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFD6EAF8" } } as ExcelJS.Fill;
  sheet.addRow(["Ref:", model.referenceNumber.includes("_") ? model.referenceNumber.split("_").pop() : model.referenceNumber]);
  sheet.addRow(["Client:", model.client.name || "N/A"]);
  sheet.addRow(["Address:", model.client.address || "N/A"]);
  sheet.addRow([]);
  const header = sheet.addRow(columns.map((column) => column.label));
  header.eachCell((cell) => {
    cell.font = { bold: true };
    cell.fill = headerFill;
    cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    applyBorder(cell);
  });
  for (const item of model.items) {
    const row = sheet.addRow(columns.map((column) => column.render(item)));
    row.eachCell((cell, colNumber) => {
      cell.alignment = { horizontal: colNumber === 2 ? "left" : "center", vertical: "top", wrapText: true };
      if (typeof cell.value === "number" && colNumber > 4) cell.numFmt = "#,##0.00";
      applyBorder(cell);
    });
  }
  sheet.addRow([]);
  sheet.addRow(["PRICE SUMMARY"]).font = { bold: true };
  sheet.addRow(["Grand Total USD", money(model.totals.grandTotals.foreignUsd)]);
  sheet.addRow(["Grand Total BDT", money(model.totals.grandTotals.foreignGrandTotalBdt)]);
  sheet.addRow(["Amount In Words", model.amountInWords.foreignGrandTotalBdt]);
  columns.forEach((column, index) => { sheet.getColumn(index + 1).width = column.width; });
}

function addSummarySheet(workbook: ExcelJS.Workbook, model: OfferDocumentModel) {
  if (!model.settings.isSummaryPageEnabled) return;
  const sheet = workbook.addWorksheet("Financial Summary", { pageSetup: { paperSize: 9, orientation: "portrait", fitToPage: true, fitToWidth: 1, fitToHeight: 0 } });
  const headerFill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFD6EAF8" } } as ExcelJS.Fill;
  sheet.mergeCells("A1:D1");
  sheet.getCell("A1").value = "SUMMARY OF SUPPLY & INSTALLATION OF FIRE PROTECTION SYSTEM AND FIRE DETECTION & ALARM SYSTEM";
  sheet.getCell("A1").font = { bold: true, underline: true, size: 14 };
  sheet.getCell("A1").alignment = { horizontal: "center", vertical: "middle", wrapText: true };
  sheet.getCell("A1").fill = headerFill;
  sheet.addRow([]);
  sheet.addRow(["Project Name:", model.client.name || "N/A"]);
  sheet.addRow(["Submitted By:", "AMO Green Energy Limited"]);
  sheet.addRow(["Reference:", model.referenceNumber.includes("_") ? model.referenceNumber.split("_").pop() : model.referenceNumber]);
  sheet.addRow([]);
  sheet.mergeCells("A7:D7");
  sheet.getCell("A7").value = "PRICE SUMMARY";
  sheet.getCell("A7").font = { bold: true, size: 12 };
  sheet.getCell("A7").alignment = { horizontal: "center" };
  sheet.getCell("A7").fill = headerFill;
  sheet.addRow([]);
  const header = sheet.addRow(["SL", "Scope of Works", "Imported Items with Sea Freight (USD)", "Supply, Installation, Testing & Commissioning (BDT)"]);
  header.eachCell((cell) => {
    cell.font = { bold: true };
    cell.fill = headerFill;
    cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    applyBorder(cell);
  });
  const scopes = model.settings.summaryScopeDescriptions as Record<string, unknown>;
  Object.entries(scopes || {}).forEach(([key, value], index) => {
    const row = sheet.addRow([String.fromCharCode(65 + index), value || key, "", ""]);
    row.eachCell((cell) => applyBorder(cell));
  });
  sheet.columns = [{ width: 10 }, { width: 45 }, { width: 30 }, { width: 35 }];
}

export async function generateOfferXlsxBuffer(model: OfferDocumentModel) {
  const workbook = new ExcelJS.Workbook();
  addSummarySheet(workbook, model);
  addOfferSheet(workbook, model);
  const bytes = await workbook.xlsx.writeBuffer();
  return Buffer.from(bytes);
}
