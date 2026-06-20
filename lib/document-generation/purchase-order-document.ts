function decimalString(value: unknown) {
  if (value === null || value === undefined) return "";
  if (typeof value === "object" && "toString" in value && typeof value.toString === "function") return value.toString();
  return String(value);
}

function numberValue(value: unknown) {
  const parsed = Number(decimalString(value).replace(/,/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function clientValue(snapshot: unknown, key: string, fallbackKey?: string) {
  const r = record(snapshot);
  return String(r[key] ?? (fallbackKey ? r[fallbackKey] : "") ?? "");
}

export function buildPurchaseOrderDocumentModel(project: any) {
  const metadata = record(project.metadata);
  const po = record(metadata.purchaseOrder);
  const items = project.items.map((item: any, index: number) => {
    const qty = numberValue(item.qty);
    const poPriceUsd = numberValue(item.poPriceUsd);
    const poPriceBdt = numberValue(item.poPriceBdt);
    return {
      serial: index + 1,
      itemCode: String(item.itemCode || ""),
      productType: String(item.productType || ""),
      make: String(item.make || ""),
      model: String(item.model || ""),
      approvals: String(item.approvals || ""),
      description: String(item.descriptionPlain || item.descriptionHtml || ""),
      qty,
      unit: String(item.unit || ""),
      poPriceUsd,
      poTotalUsd: numberValue(item.poTotalUsd) || qty * poPriceUsd,
      poPriceBdt,
      poTotalBdt: qty * poPriceBdt,
    };
  });

  const totals = items.reduce((sum: { usd: number; bdt: number }, item: any) => {
    sum.usd += item.poTotalUsd;
    sum.bdt += item.poTotalBdt;
    return sum;
  }, { usd: 0, bdt: 0 });

  return {
    projectId: project.id,
    referenceNumber: project.referenceNumber,
    originalOfferReference: String(po.originalOfferReference || project.parentProject?.referenceNumber || ""),
    client: { name: clientValue(project.clientSnapshot, "name", "client_name"), address: clientValue(project.clientSnapshot, "address", "client_address") },
    preparedBy: project.owner?.name || project.owner?.email || "",
    terms: String(po.terms || ""),
    items,
    totals,
    generatedAt: new Date().toISOString(),
  };
}
