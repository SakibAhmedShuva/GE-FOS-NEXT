import type { buildPurchaseOrderDocumentModel } from "@/lib/document-generation/purchase-order-document";

type PurchaseOrderDocumentModel = ReturnType<typeof buildPurchaseOrderDocumentModel>;
function esc(value: unknown) { return String(value ?? "").replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)").replace(/[\r\n]+/g, " "); }
function money(value: number) { return Number(value || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }

export function generatePurchaseOrderPdfBuffer(model: PurchaseOrderDocumentModel) {
  const lines = [
    "PURCHASE ORDER",
    `PO Reference: ${model.referenceNumber}`,
    `Original Offer: ${model.originalOfferReference || "-"}`,
    `Client: ${model.client.name}`,
    `Address: ${model.client.address}`,
    `Prepared By: ${model.preparedBy}`,
    `Generated: ${new Date(model.generatedAt).toLocaleString()}`,
    "",
    "Items:",
    ...model.items.slice(0, 36).map((item: PurchaseOrderDocumentModel["items"][number]) => `${item.serial}. ${item.itemCode || item.productType || "Item"} | Qty ${item.qty} ${item.unit} | PO USD ${money(item.poPriceUsd)} | ${item.description}`),
    model.items.length > 36 ? `... ${model.items.length - 36} more items included in XLSX/export model` : "",
    "",
    `PO Grand Total USD: ${money(model.totals.usd)}`,
    `PO Grand Total BDT: ${money(model.totals.bdt)}`,
    `Terms: ${model.terms || "-"}`,
  ].filter((line) => line !== "");
  const commands = ["BT", "/F1 10 Tf", "50 790 Td"];
  lines.forEach((line, index) => { if (index > 0) commands.push("0 -15 Td"); commands.push(`(${esc(line).slice(0, 115)}) Tj`); });
  commands.push("ET");
  const stream = commands.join("\n");
  const objects = [
    "1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj",
    "2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj",
    "3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >> endobj",
    "4 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj",
    `5 0 obj << /Length ${Buffer.byteLength(stream, "utf8")} >> stream\n${stream}\nendstream endobj`,
  ];
  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  for (const object of objects) { offsets.push(Buffer.byteLength(pdf, "utf8")); pdf += `${object}\n`; }
  const xrefOffset = Buffer.byteLength(pdf, "utf8");
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (let i = 1; i <= objects.length; i += 1) pdf += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  pdf += `trailer << /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  return Buffer.from(pdf, "utf8");
}
