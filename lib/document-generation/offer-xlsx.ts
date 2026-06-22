import ExcelJS from "exceljs";
import type { buildOfferDocumentModel } from "@/lib/document-generation/offer-document";

type OfferDocumentModel = ReturnType<typeof buildOfferDocumentModel>;

function currency(value: number) {
  return Number.isFinite(value) ? value : 0;
}

export async function generateOfferXlsxBuffer(model: OfferDocumentModel) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Financial Offer System";
  workbook.created = new Date();

  const sheet = workbook.addWorksheet("Financial Offer", {
    pageSetup: { paperSize: 9, orientation: "landscape", fitToPage: true, fitToWidth: 1 },
  });

  sheet.mergeCells("A1:J1");
  sheet.getCell("A1").value = "Financial Offer";
  sheet.getCell("A1").font = { bold: true, size: 18 };
  sheet.getCell("A1").alignment = { horizontal: "center" };

  sheet.addRow([]);
  sheet.addRow(["Reference", model.referenceNumber, "Generated", new Date(model.generatedAt).toLocaleString()]);
  sheet.addRow(["Client", model.client.name]);
  sheet.addRow(["Address", model.client.address]);
  sheet.addRow(["Prepared by", model.preparedBy]);
  sheet.addRow([]);

  const columns = [
    { key: "serial", header: "SL", width: 6 },
    { key: "itemCode", header: "Item Code", width: 18 },
    { key: "productType", header: "Product", width: 18 },
    { key: "description", header: "Description", width: 60 },
    { key: "qty", header: "Qty", width: 10 },
    { key: "unit", header: "Unit", width: 10 },
  ];

  if (model.visibleColumns.foreign_price) {
    columns.push({ key: "foreignPriceUsd", header: "Foreign Unit USD", width: 18 });
    columns.push({ key: "foreignTotalUsd", header: "Foreign Total USD", width: 18 });
  }
  if (model.visibleColumns.po_price) {
    columns.push({ key: "poPriceUsd", header: "PO Unit USD", width: 16 });
    columns.push({ key: "poTotalUsd", header: "PO Total USD", width: 16 });
  }
  if (model.visibleColumns.local_supply_price) {
    columns.push({ key: "localSupplyPriceBdt", header: "Local Unit BDT", width: 18 });
    columns.push({ key: "localSupplyTotalBdt", header: "Local Total BDT", width: 18 });
  }
  if (model.visibleColumns.installation_price) {
    columns.push({ key: "installationPriceBdt", header: "Install Unit BDT", width: 18 });
    columns.push({ key: "installationTotalBdt", header: "Install Total BDT", width: 18 });
  }

  const headerRow = sheet.addRow(columns.map((column) => column.header));
  headerRow.font = { bold: true };
  headerRow.eachCell((cell) => {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE2E8F0" } };
    cell.border = { top: { style: "thin" }, bottom: { style: "thin" }, left: { style: "thin" }, right: { style: "thin" } };
  });

  columns.forEach((column, index) => {
    sheet.getColumn(index + 1).width = column.width;
  });

  for (const item of model.items) {
    const row = sheet.addRow(columns.map((column) => item[column.key as keyof typeof item] ?? ""));
    row.eachCell((cell, colNumber) => {
      cell.alignment = { vertical: "top", wrapText: colNumber === 4 };
      cell.border = { top: { style: "thin" }, bottom: { style: "thin" }, left: { style: "thin" }, right: { style: "thin" } };
      if (colNumber > 6) cell.numFmt = "#,##0.00";
    });
  }

  sheet.addRow([]);
  sheet.addRow(["Subtotal Foreign USD", currency(model.totals.subtotals.foreignUsd)]);
  sheet.addRow(["Freight Foreign USD", currency(model.totals.adjustments.freightForeignUsd)]);
  sheet.addRow(["Discount Foreign USD", currency(model.totals.adjustments.discountForeignUsd)]);
  sheet.addRow([model.labels.grandtotalForeign, currency(model.totals.grandTotals.foreignUsd)]);
  sheet.addRow(["PO Grand Total USD", currency(model.totals.grandTotals.poUsd)]);
  sheet.addRow(["Local Supply Grand Total BDT", currency(model.totals.grandTotals.localSupplyBdt)]);
  sheet.addRow(["Installation Grand Total BDT", currency(model.totals.grandTotals.installationBdt)]);
  sheet.addRow(["Total In BDT", currency(model.totals.adjustments.totalInBdt)]);
  sheet.addRow(["Customs Duty BDT", currency(model.totals.adjustments.customsDutyBdt)]);
  sheet.addRow(["Foreign Grand Total With Customs BDT", currency(model.totals.grandTotals.foreignGrandTotalBdt)]);
  sheet.addRow(["Amount in words", model.amountInWords.foreignGrandTotalBdt]);

  const tnc = model.settings.tncState as Record<string, unknown>;
  const terms: string[] = [];
  if (tnc?.international) terms.push("International supply terms apply.");
  if (tnc?.local_supply) terms.push("Local supply terms apply.");
  if (tnc?.local_installation) terms.push("Installation terms apply.");
  if (typeof tnc?.value === "string" && tnc.value.trim()) {
    terms.push(...tnc.value.split(/\r?\n/).map((line) => line.trim()).filter(Boolean));
  }
  if (terms.length) {
    sheet.addRow([]);
    sheet.addRow(["Terms & Conditions"]);
    for (const term of terms) sheet.addRow([term]);
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer as ArrayBuffer);
}
