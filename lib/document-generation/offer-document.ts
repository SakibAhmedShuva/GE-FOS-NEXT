import { calculateOfferTotals, type OfferConfig, type OfferFinancials, type OfferVisibleColumns } from "@/lib/calculations/offer";
import { amountInWords } from "@/lib/format/amount-in-words";

type LoadedOfferProject = {
  id: string;
  referenceNumber: string;
  clientSnapshot: unknown;
  items: Array<any>;
  offerSetting: any;
  owner?: { name?: string | null; email?: string | null } | null;
};

function decimalString(value: unknown) {
  if (value === null || value === undefined) return "";
  if (typeof value === "object" && "toString" in value && typeof value.toString === "function") return value.toString();
  return String(value);
}

function numberValue(value: unknown) {
  const parsed = Number(decimalString(value).replace(/,/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

function recordValue(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function clientValue(snapshot: unknown, key: string, fallbackKey?: string) {
  const record = recordValue(snapshot);
  return String(record[key] ?? (fallbackKey ? record[fallbackKey] : "") ?? "");
}

export function buildOfferDocumentModel(project: LoadedOfferProject, config: OfferConfig) {
  const settings = recordValue(project.offerSetting);
  const visibleColumns = recordValue(settings.visibleColumns) as OfferVisibleColumns;
  const financials = recordValue(settings.financials) as OfferFinancials;

  const items = project.items.map((item, index) => ({
    serial: index + 1,
    itemCode: String(item.itemCode ?? ""),
    productType: String(item.productType ?? ""),
    make: String(item.make ?? ""),
    model: String(item.model ?? ""),
    approvals: String(item.approvals ?? ""),
    description: String(item.descriptionPlain ?? item.descriptionHtml ?? ""),
    qty: numberValue(item.qty),
    unit: String(item.unit ?? ""),
    foreignPriceUsd: numberValue(item.foreignPriceUsd),
    foreignTotalUsd: numberValue(item.foreignTotalUsd),
    poPriceUsd: numberValue(item.poPriceUsd),
    poTotalUsd: numberValue(item.poTotalUsd),
    localSupplyPriceBdt: numberValue(item.localSupplyPriceBdt),
    localSupplyTotalBdt: numberValue(item.localSupplyTotalBdt),
    installationPriceBdt: numberValue(item.installationPriceBdt),
    installationTotalBdt: numberValue(item.installationTotalBdt),
  }));

  const totals = calculateOfferTotals({
    items: project.items.map((item) => ({
      qty: decimalString(item.qty),
      foreign_price_usd: decimalString(item.foreignPriceUsd),
      foreign_total_usd: decimalString(item.foreignTotalUsd),
      po_price_usd: decimalString(item.poPriceUsd),
      po_total_usd: decimalString(item.poTotalUsd),
      local_supply_price_bdt: decimalString(item.localSupplyPriceBdt),
      local_supply_total_bdt: decimalString(item.localSupplyTotalBdt),
      installation_price_bdt: decimalString(item.installationPriceBdt),
      installation_total_bdt: decimalString(item.installationTotalBdt),
    })),
    visibleColumns,
    financials,
    config,
  });

  return {
    projectId: project.id,
    referenceNumber: project.referenceNumber,
    preparedBy: project.owner?.name || project.owner?.email || "",
    client: {
      name: clientValue(project.clientSnapshot, "name", "client_name"),
      address: clientValue(project.clientSnapshot, "address", "client_address"),
    },
    visibleColumns,
    financials,
    labels: totals.labels,
    items,
    totals,
    amountInWords: {
      foreignGrandTotalBdt: amountInWords(totals.grandTotals.foreignGrandTotalBdt, "Taka"),
      localSupplyBdt: amountInWords(totals.grandTotals.localSupplyBdt, "Taka"),
      installationBdt: amountInWords(totals.grandTotals.installationBdt, "Taka"),
    },
    settings: {
      includeSignature: Boolean(settings.includeSignature),
      selectedCoverId: String(settings.selectedCoverId ?? ""),
      tncState: recordValue(settings.tncState),
      isSummaryPageEnabled: Boolean(settings.isSummaryPageEnabled),
      summaryScopeDescriptions: recordValue(settings.summaryScopeDescriptions),
    },
    config,
    generatedAt: new Date().toISOString(),
  };
}
