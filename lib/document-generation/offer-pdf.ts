import type { buildOfferDocumentModel } from "@/lib/document-generation/offer-document";

type OfferDocumentModel = ReturnType<typeof buildOfferDocumentModel>;

function escapePdfText(value: unknown) {
  return String(value ?? "")
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)")
    .replace(/[\r\n]+/g, " ");
}

function money(value: number) {
  return Number(value || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function makePage(lines: string[]) {
  const commands = ["BT", "/F1 10 Tf", "50 790 Td"];
  lines.forEach((line, index) => {
    if (index > 0) commands.push("0 -15 Td");
    commands.push(`(${escapePdfText(line).slice(0, 115)}) Tj`);
  });
  commands.push("ET");
  return commands.join("\n");
}

export function generateOfferPdfBuffer(model: OfferDocumentModel) {
  const lines = [
    "FINANCIAL OFFER",
    `Reference: ${model.referenceNumber}`,
    `Client: ${model.client.name}`,
    `Address: ${model.client.address}`,
    `Prepared By: ${model.preparedBy}`,
    `Generated: ${new Date(model.generatedAt).toLocaleString()}`,
    "",
    "Items:",
    ...model.items.slice(0, 32).map((item) => `${item.serial}. ${item.itemCode || item.productType || "Item"} | Qty ${item.qty} ${item.unit} | ${item.description}`),
    model.items.length > 32 ? `... ${model.items.length - 32} more items included in XLSX/export model` : "",
    "",
    `Subtotal Foreign USD: ${money(model.totals.subtotals.foreignUsd)}`,
    `${model.labels.grandtotalForeign} ${money(model.totals.grandTotals.foreignUsd)}`,
    `PO Grand Total USD: ${money(model.totals.grandTotals.poUsd)}`,
    `Local Supply Grand Total BDT: ${money(model.totals.grandTotals.localSupplyBdt)}`,
    `Installation Grand Total BDT: ${money(model.totals.grandTotals.installationBdt)}`,
    `Total In BDT: ${money(model.totals.adjustments.totalInBdt)}`,
    `Customs Duty BDT: ${money(model.totals.adjustments.customsDutyBdt)}`,
    `Foreign Grand Total With Customs BDT: ${money(model.totals.grandTotals.foreignGrandTotalBdt)}`,
    `Amount In Words: ${model.amountInWords.foreignGrandTotalBdt}`,
    "",
    `Signature Included: ${model.settings.includeSignature ? "Yes" : "No"}`,
    `Selected Cover ID: ${model.settings.selectedCoverId || "None"}`,
    `T&C State: ${JSON.stringify(model.settings.tncState)}`,
  ].filter((line) => line !== "");

  const stream = makePage(lines);
  const objects = [
    "1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj",
    "2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj",
    "3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >> endobj",
    "4 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj",
    `5 0 obj << /Length ${Buffer.byteLength(stream, "utf8")} >> stream\n${stream}\nendstream endobj`,
  ];

  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  for (const object of objects) {
    offsets.push(Buffer.byteLength(pdf, "utf8"));
    pdf += `${object}\n`;
  }
  const xrefOffset = Buffer.byteLength(pdf, "utf8");
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += "0000000000 65535 f \n";
  for (let index = 1; index <= objects.length; index += 1) {
    pdf += `${String(offsets[index]).padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer << /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  return Buffer.from(pdf, "utf8");
}
