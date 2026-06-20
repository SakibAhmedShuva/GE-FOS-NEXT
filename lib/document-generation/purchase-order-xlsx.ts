import ExcelJS from "exceljs";
import type { buildPurchaseOrderDocumentModel } from "@/lib/document-generation/purchase-order-document";

type PurchaseOrderDocumentModel = ReturnType<typeof buildPurchaseOrderDocumentModel>;
function money(value: number) { return Number.isFinite(value) ? value : 0; }

export async function generatePurchaseOrderXlsxBuffer(model: PurchaseOrderDocumentModel) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Financial Offer System";
  workbook.created = new Date();
  const sheet = workbook.addWorksheet("Purchase Order", { pageSetup: { paperSize: 9, orientation: "landscape", fitToPage: true, fitToWidth: 1 } });
  sheet.mergeCells("A1:K1");
  sheet.getCell("A1").value = "PURCHASE ORDER";
  sheet.getCell("A1").font = { bold: true, size: 18 };
  sheet.getCell("A1").alignment = { horizontal: "center" };
  sheet.addRow([]);
  sheet.addRow(["PO Reference", model.referenceNumber, "Generated", new Date(model.generatedAt).toLocaleString()]);
  sheet.addRow(["Original Offer", model.originalOfferReference || "-"]);
  sheet.addRow(["Client", model.client.name]);
  sheet.addRow(["Address", model.client.address]);
  sheet.addRow(["Prepared By", model.preparedBy]);
  sheet.addRow([]);
  const columns = [
    { key: "serial", header: "SL", width: 6 },
    { key: "itemCode", header: "Item Code", width: 18 },
    { key: "productType", header: "Product", width: 18 },
    { key: "make", header: "Make", width: 14 },
    { key: "model", header: "Model", width: 16 },
    { key: "description", header: "Description", width: 60 },
    { key: "qty", header: "Qty", width: 10 },
    { key: "unit", header: "Unit", width: 10 },
    { key: "poPriceUsd", header: "PO Unit USD", width: 16 },
    { key: "poTotalUsd", header: "PO Total USD", width: 16 },
    { key: "poPriceBdt", header: "PO Unit BDT", width: 16 },
    { key: "poTotalBdt", header: "PO Total BDT", width: 16 },
  ];
  const header = sheet.addRow(columns.map((column) => column.header));
  header.font = { bold: true };
  header.eachCell((cell: any) => {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE2E8F0" } };
    cell.border = { top: { style: "thin" }, bottom: { style: "thin" }, left: { style: "thin" }, right: { style: "thin" } };
  });
  columns.forEach((column, index) => { sheet.getColumn(index + 1).width = column.width; });
  for (const item of model.items) {
    const row = sheet.addRow(columns.map((column) => item[column.key as keyof typeof item] ?? ""));
    row.eachCell((cell: any, colNumber: number) => {
      cell.alignment = { vertical: "top", wrapText: colNumber === 6 };
      cell.border = { top: { style: "thin" }, bottom: { style: "thin" }, left: { style: "thin" }, right: { style: "thin" } };
      if (colNumber >= 9) cell.numFmt = "#,##0.00";
    });
  }
  sheet.addRow([]);
  sheet.addRow(["PO Grand Total USD", money(model.totals.usd)]);
  sheet.addRow(["PO Grand Total BDT", money(model.totals.bdt)]);
  if (model.terms) { sheet.addRow([]); sheet.addRow(["Terms", model.terms]); }
  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer as ArrayBuffer);
}
