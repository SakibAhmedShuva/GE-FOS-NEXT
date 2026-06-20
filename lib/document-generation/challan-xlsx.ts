import ExcelJS from "exceljs";
import type { buildChallanDocumentModel } from "@/lib/document-generation/challan-document";

type ChallanDocumentModel = ReturnType<typeof buildChallanDocumentModel>;

export async function generateChallanXlsxBuffer(model: ChallanDocumentModel) {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Challan", { pageSetup: { paperSize: 9, orientation: "portrait", fitToPage: true, fitToWidth: 1 } });
  sheet.columns = [
    { header: "SL", key: "serial", width: 8 },
    { header: "Item Code", key: "itemCode", width: 18 },
    { header: "Product", key: "productType", width: 18 },
    { header: "Description", key: "description", width: 65 },
    { header: "Qty", key: "qty", width: 12 },
    { header: "Unit", key: "unit", width: 12 },
  ];
  sheet.spliceRows(1, 0, ["CHALLAN"], [], ["Reference", model.referenceNumber, "Date", model.challanDate], ["Client", model.client.name], ["Address", model.client.address], ["Carrier", model.challanCarrier], []);
  sheet.mergeCells("A1:F1");
  sheet.getCell("A1").font = { bold: true, size: 18 };
  const headerRow = sheet.getRow(7);
  headerRow.font = { bold: true };
  model.items.forEach((item: ChallanDocumentModel["items"][number]) => sheet.addRow(item));
  sheet.addRow([]);
  sheet.addRow(["Signed Copy Received", model.signedCopyReceived]);
  sheet.addRow(["Remarks", model.remarks]);
  sheet.addRow(["Prepared By", model.preparedBy]);
  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer as ArrayBuffer);
}
