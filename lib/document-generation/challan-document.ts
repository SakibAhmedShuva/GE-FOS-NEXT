function decimalString(value: unknown) {
  if (value === null || value === undefined) return "";
  if (typeof value === "object" && "toString" in value && typeof value.toString === "function") return value.toString();
  return String(value);
}
function record(value: unknown): Record<string, unknown> { return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {}; }
function clientValue(snapshot: unknown, key: string, fallbackKey?: string) { const r = record(snapshot); return String(r[key] ?? (fallbackKey ? r[fallbackKey] : "") ?? ""); }
export function buildChallanDocumentModel(project: any) {
  const metadata = record(project.metadata);
  const challan = record(metadata.challan);
  return {
    projectId: project.id,
    referenceNumber: project.referenceNumber,
    client: { name: clientValue(project.clientSnapshot, "name", "client_name"), address: clientValue(project.clientSnapshot, "address", "client_address") },
    preparedBy: project.owner?.name || project.owner?.email || "",
    challanDate: String(challan.challanDate || new Date().toISOString().slice(0, 10)),
    includeSignature: Boolean(challan.includeSignature),
    signedCopyReceived: String(challan.signedCopyReceived || ""),
    remarks: String(challan.remarks || ""),
    challanCarrier: String(challan.challanCarrier || ""),
    items: project.items.map((item: any, index: number) => ({ serial: index + 1, itemCode: item.itemCode || "", productType: item.productType || "", description: item.descriptionPlain || item.descriptionHtml || "", qty: decimalString(item.qty), unit: item.unit || "" })),
    generatedAt: new Date().toISOString(),
  };
}
