import type { buildChallanDocumentModel } from "@/lib/document-generation/challan-document";

type ChallanDocumentModel = ReturnType<typeof buildChallanDocumentModel>;
function esc(value: unknown) { return String(value ?? "").replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)").replace(/[\r\n]+/g, " "); }
export function generateChallanPdfBuffer(model: ChallanDocumentModel) {
  const lines = ["CHALLAN", `Reference: ${model.referenceNumber}`, `Date: ${model.challanDate}`, `Client: ${model.client.name}`, `Address: ${model.client.address}`, `Carrier: ${model.challanCarrier}`, "Items:", ...model.items.slice(0, 38).map((item: ChallanDocumentModel["items"][number]) => `${item.serial}. ${item.itemCode || item.productType} | Qty ${item.qty} ${item.unit} | ${item.description}`), `Signed Copy Received: ${model.signedCopyReceived}`, `Remarks: ${model.remarks}`, `Prepared By: ${model.preparedBy}`];
  const commands = ["BT", "/F1 10 Tf", "50 790 Td"];
  lines.forEach((line, index) => { if (index > 0) commands.push("0 -15 Td"); commands.push(`(${esc(line).slice(0, 115)}) Tj`); });
  commands.push("ET");
  const stream = commands.join("\n");
  const objects = ["1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj", "2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj", "3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >> endobj", "4 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj", `5 0 obj << /Length ${Buffer.byteLength(stream, "utf8")} >> stream\n${stream}\nendstream endobj`];
  let pdf = "%PDF-1.4\n"; const offsets = [0]; objects.forEach((object) => { offsets.push(Buffer.byteLength(pdf, "utf8")); pdf += `${object}\n`; }); const xrefOffset = Buffer.byteLength(pdf, "utf8"); pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`; for (let i = 1; i <= objects.length; i++) pdf += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`; pdf += `trailer << /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`; return Buffer.from(pdf, "utf8");
}
