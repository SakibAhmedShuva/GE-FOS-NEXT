import ExcelJS from "exceljs";
import type { buildChallanDocumentModel } from "@/lib/document-generation/challan-document";

type ChallanDocumentModel = ReturnType<typeof buildChallanDocumentModel>;

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

function challanOnlyNumber(ref: string) {
  if (ref.startsWith("DC_")) return ref.split("_")[1] || ref;
  return ref;
}

function applyBorder(cell: ExcelJS.Cell) {
  cell.border = { top: { style: "thin" }, left: { style: "thin" }, bottom: { style: "thin" }, right: { style: "thin" } };
}

export async function generateChallanXlsxBuffer(model: ChallanDocumentModel) {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Delivery Challan", { pageSetup: { paperSize: 9, orientation: "portrait", fitToPage: true, fitToWidth: 1, fitToHeight: 0 } });
  const headerFill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFD6EAF8" } } as ExcelJS.Fill;

  sheet.mergeCells("A1:D1");
  sheet.getCell("A1").value = "DELIVERY CHALLAN";
  sheet.getCell("A1").font = { bold: true, size: 18 };
  sheet.getCell("A1").alignment = { horizontal: "center", vertical: "middle" };
  sheet.getCell("A1").fill = headerFill;

  sheet.addRow([]);
  sheet.addRow(["Challan No:", challanOnlyNumber(model.referenceNumber)]);
  sheet.addRow(["Client:", model.client.name || "N/A"]);
  sheet.addRow(["Address:", model.client.address || "N/A"]);
  sheet.addRow([]);

  for (const rowNumber of [3, 4, 5]) sheet.getCell(rowNumber, 1).font = { bold: true };

  const header = sheet.addRow(["SL", "Item Description", "Quantity", "Unit"]);
  header.eachCell((cell) => {
    cell.font = { bold: true };
    cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    cell.fill = headerFill;
    applyBorder(cell);
  });

  for (const item of model.items) {
    const row = sheet.addRow([item.serial, stripHtml(item.description), Number(item.qty || 0), item.unit || "Pcs"]);
    row.eachCell((cell, colNumber) => {
      cell.alignment = { horizontal: colNumber === 2 ? "left" : "center", vertical: "top", wrapText: true };
      applyBorder(cell);
    });
  }

  sheet.columns = [{ width: 10 }, { width: 70 }, { width: 15 }, { width: 15 }];
  const signatureRow = sheet.rowCount + 7;
  sheet.getCell(signatureRow, 1).value = "____________________";
  sheet.getCell(signatureRow, 3).value = "____________________";
  sheet.mergeCells(signatureRow, 3, signatureRow, 4);
  sheet.getCell(signatureRow + 1, 1).value = "Received By";
  sheet.getCell(signatureRow + 1, 3).value = "Authorized Signature";
  sheet.mergeCells(signatureRow + 1, 3, signatureRow + 1, 4);
  for (const address of [`A${signatureRow}`, `C${signatureRow}`, `A${signatureRow + 1}`, `C${signatureRow + 1}`]) {
    sheet.getCell(address).font = { bold: true };
    sheet.getCell(address).alignment = { horizontal: address.startsWith("C") ? "center" : "center" };
  }

  const bytes = await workbook.xlsx.writeBuffer();
  return Buffer.from(bytes);
}
