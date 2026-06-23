import ExcelJS from "exceljs";
import type { buildPurchaseOrderDocumentModel } from "@/lib/document-generation/purchase-order-document";

type PurchaseOrderDocumentModel = ReturnType<typeof buildPurchaseOrderDocumentModel>;

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

function applyBorder(cell: ExcelJS.Cell) {
  cell.border = { top: { style: "thin" }, left: { style: "thin" }, bottom: { style: "thin" }, right: { style: "thin" } };
}

export async function generatePurchaseOrderXlsxBuffer(model: PurchaseOrderDocumentModel) {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Purchase Order", { pageSetup: { paperSize: 9, orientation: "portrait", fitToPage: true, fitToWidth: 1, fitToHeight: 0 } });
  const headerFill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFD6EAF8" } } as ExcelJS.Fill;

  sheet.mergeCells("A1:F1");
  sheet.getCell("A1").value = "Purchase Order";
  sheet.getCell("A1").font = { bold: true, size: 18 };
  sheet.getCell("A1").alignment = { horizontal: "center", vertical: "middle" };
  sheet.getCell("A1").fill = headerFill;

  sheet.addRow([]);
  sheet.addRow(["PO Reference:", model.referenceNumber]);
  sheet.addRow(["For Project/Client:", model.client.name || "N/A"]);
  sheet.addRow(["Original FO Ref:", model.originalOfferReference || "-"]);
  sheet.addRow([]);
  for (const rowNumber of [3, 4, 5]) sheet.getCell(rowNumber, 1).font = { bold: true };

  const header = sheet.addRow(["SL", "Description", "PO Price", "Qty", "Unit", "Total"]);
  header.eachCell((cell) => {
    cell.font = { bold: true };
    cell.fill = headerFill;
    cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    applyBorder(cell);
  });

  const itemStartRow = sheet.rowCount + 1;
  for (const item of model.items) {
    const rowNumber = sheet.rowCount + 1;
    const row = sheet.addRow([item.serial, stripHtml(item.description), Number(item.poPriceUsd || 0), Number(item.qty || 0), item.unit || "Pcs", { formula: `C${rowNumber}*D${rowNumber}` }]);
    row.eachCell((cell, colNumber) => {
      cell.alignment = { horizontal: colNumber === 2 ? "left" : "right", vertical: "top", wrapText: true };
      if ([3, 4, 6].includes(colNumber)) cell.numFmt = "#,##0.00";
      applyBorder(cell);
    });
  }
  const itemEndRow = sheet.rowCount;
  sheet.addRow([]);
  const totalRow = sheet.addRow([null, null, null, null, "Grand Total:", itemEndRow >= itemStartRow ? { formula: `SUM(F${itemStartRow}:F${itemEndRow})` } : 0]);
  totalRow.getCell(5).font = { bold: true, size: 12 };
  totalRow.getCell(6).font = { bold: true, size: 12 };
  totalRow.getCell(6).numFmt = "#,##0.00";
  totalRow.getCell(5).alignment = { horizontal: "right" };
  totalRow.getCell(6).alignment = { horizontal: "right" };

  sheet.columns = [{ width: 5 }, { width: 60 }, { width: 15 }, { width: 10 }, { width: 10 }, { width: 20 }];
  const bytes = await workbook.xlsx.writeBuffer();
  return Buffer.from(bytes);
}
