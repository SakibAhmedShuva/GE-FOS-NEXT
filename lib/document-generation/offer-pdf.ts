import type { buildOfferDocumentModel } from "@/lib/document-generation/offer-document";
import { buildBusinessPdfBuffer, type BusinessPdfColumn } from "@/lib/document-generation/business-pdf";
import { money } from "@/lib/document-generation/basic-pdf";

type OfferDocumentModel = ReturnType<typeof buildOfferDocumentModel>;
type OfferItem = OfferDocumentModel["items"][number];

function formatBusinessDate(value: string | Date) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" }).format(date).replace(/ /g, "-");
}

function visibleMap(model: OfferDocumentModel) {
  return (model.visibleColumns || {}) as Record<string, unknown>;
}

function isVisible(model: OfferDocumentModel, aliases: string[], fallback = true) {
  const visible = visibleMap(model);
  const existing = aliases.filter((key) => Object.prototype.hasOwnProperty.call(visible, key));
  if (!existing.length) return fallback;
  return existing.some((key) => visible[key] !== false);
}

function canShowPoColumns(model: OfferDocumentModel) {
  const explicit = (model as unknown as { canShowPoColumns?: boolean }).canShowPoColumns;
  if (typeof explicit === "boolean") return explicit;
  const settingsExplicit = (model.settings as unknown as { canShowPoColumns?: boolean }).canShowPoColumns;
  if (typeof settingsExplicit === "boolean") return settingsExplicit;
  const role = (model as unknown as { userRole?: string; exporterRole?: string; user?: { role?: string } }).userRole
    || (model as unknown as { exporterRole?: string }).exporterRole
    || (model as unknown as { user?: { role?: string } }).user?.role;
  return role === "admin" || role === "ADMIN";
}

function offerColumns(model: OfferDocumentModel): BusinessPdfColumn<OfferItem>[] {
  const foreignVisible = isVisible(model, ["foreign_price", "foreignPrice", "foreign", "showForeignPrice", "foreignPriceUsd"], true);
  const localVisible = isVisible(model, ["local_supply_price", "localSupply", "local", "showLocalSupply", "localSupplyPriceBdt"], false);
  const installVisible = isVisible(model, ["installation_price", "installation", "install", "showInstallation", "installationPriceBdt"], false);
  const poVisible = canShowPoColumns(model) && isVisible(model, ["po_price", "po", "showPo", "poPriceUsd"], false);

  const labels = (model.labels || {}) as Record<string, string>;
  const columns: BusinessPdfColumn<OfferItem>[] = [
    { key: "serial", label: "SL", width: 8, align: "center", render: (item) => String(item.serial) },
    { key: "description", label: "DESCRIPTION", width: 200, render: (item) => item.description || "-" },
    { key: "qty", label: "QTY", width: 10, align: "center", render: (item) => money(Number(item.qty || 0)).replace(".00", "") },
    { key: "unit", label: "UNIT", width: 12, align: "center", render: (item) => item.unit || "-" },
  ];

  if (foreignVisible) {
    columns.push(
      { key: "foreignPriceUsd", group: labels.foreignPrice || "FOREIGN PRICE", label: "PRICE\n(USD)", width: 33.6, align: "right", render: (item) => money(item.foreignPriceUsd) },
      { key: "foreignTotalUsd", group: labels.foreignPrice || "FOREIGN PRICE", label: "TOTAL\n(USD)", width: 33.6, align: "right", render: (item) => money(item.foreignTotalUsd) },
    );
  }
  if (poVisible) {
    columns.push(
      { key: "poPriceUsd", group: "PO PRICE", label: "PRICE\n(USD)", width: 33.6, align: "right", render: (item) => money(item.poPriceUsd) },
      { key: "poTotalUsd", group: "PO PRICE", label: "TOTAL\n(USD)", width: 33.6, align: "right", render: (item) => money(item.poTotalUsd) },
    );
  }
  if (localVisible) {
    columns.push(
      { key: "localSupplyPriceBdt", group: labels.localPrice || "LOCAL SUPPLY PRICE", label: "PRICE\n(BDT)", width: 33.6, align: "right", render: (item) => money(item.localSupplyPriceBdt) },
      { key: "localSupplyTotalBdt", group: labels.localPrice || "LOCAL SUPPLY PRICE", label: "TOTAL\n(BDT)", width: 33.6, align: "right", render: (item) => money(item.localSupplyTotalBdt) },
    );
  }
  if (installVisible) {
    columns.push(
      { key: "installationPriceBdt", group: labels.installationPrice || "INSTALLATION PRICE", label: "PRICE\n(BDT)", width: 33.6, align: "right", render: (item) => money(item.installationPriceBdt) },
      { key: "installationTotalBdt", group: labels.installationPrice || "INSTALLATION PRICE", label: "TOTAL\n(BDT)", width: 33.6, align: "right", render: (item) => money(item.installationTotalBdt) },
    );
  }
  return columns;
}

function termsLines(model: OfferDocumentModel) {
  const tnc = model.settings.tncState as Record<string, unknown>;
  const lines: string[] = [];
  if (tnc.international) lines.push("International supply terms apply.");
  if (tnc.local_supply) lines.push("Local supply terms apply.");
  if (tnc.local_installation) lines.push("Installation terms apply.");
  if (Array.isArray(tnc.sections)) lines.push(...tnc.sections.map((line) => String(line)).filter(Boolean));
  const custom = typeof tnc.value === "string" ? tnc.value.trim() : "";
  if (custom) lines.push(...custom.split(/\r?\n/).map((line) => line.trim()).filter(Boolean));
  return lines;
}

function financials(model: OfferDocumentModel) {
  return ((model as unknown as { financials?: Record<string, unknown> }).financials || (model.settings as unknown as { financials?: Record<string, unknown> }).financials || {}) as Record<string, unknown>;
}

function enabledAmount(fin: Record<string, unknown>, flag: string, key: string) {
  return fin[flag] ? Number(fin[key] || 0) : 0;
}

function summaryLines(model: OfferDocumentModel) {
  const fin = financials(model);
  const freight = enabledAmount(fin, "use_freight", "freight_foreign_usd");
  const delivery = enabledAmount(fin, "use_delivery", "delivery_local_bdt");
  const vat = enabledAmount(fin, "use_vat", "vat_local_bdt");
  const ait = enabledAmount(fin, "use_ait", "ait_local_bdt");
  const totalInBdt = enabledAmount(fin, "use_total_in_bdt", "total_in_bdt") || model.totals.adjustments.totalInBdt;
  const customsDuty = enabledAmount(fin, "use_customs_duty", "customs_duty_bdt") || model.totals.adjustments.customsDutyBdt;
  const lines = [
    `Subtotal: ${money(model.totals.subtotals.foreignUsd)} USD`,
  ];
  if (freight > 0) lines.push(`Sea Freight: ${money(freight)} USD`);
  if (totalInBdt > 0) lines.push(`Total in BDT: ${money(totalInBdt)} BDT`);
  if (customsDuty > 0) lines.push(`Customs Duty: ${money(customsDuty)} BDT`);
  if (delivery > 0) lines.push(`Delivery Charge: ${money(delivery)} BDT`);
  if (vat > 0) lines.push(`VAT: ${money(vat)} BDT`);
  if (ait > 0) lines.push(`AIT: ${money(ait)} BDT`);
  lines.push(`${model.labels.grandtotalForeign || "Grand Total"}: ${money(model.totals.grandTotals.foreignUsd)} USD / ${money(model.totals.grandTotals.foreignGrandTotalBdt)} BDT`);
  lines.push(`Amount In Words: ${model.amountInWords.foreignGrandTotalBdt}`);
  return lines;
}

function summaryScopeLines(model: OfferDocumentModel) {
  if (!model.settings.isSummaryPageEnabled) return [];
  const scopes = model.settings.summaryScopeDescriptions as Record<string, unknown>;
  return Object.entries(scopes || {})
    .filter(([, value]) => String(value ?? "").trim())
    .map(([key, value], index) => `${String.fromCharCode(65 + index)}. ${String(value)}`);
}

export async function generateOfferPdfBuffer(model: OfferDocumentModel) {
  const terms = termsLines(model);
  const scopeLines = summaryScopeLines(model);
  const displayReference = model.referenceNumber.includes("_") ? model.referenceNumber.split("_").pop() || model.referenceNumber : model.referenceNumber;
  return buildBusinessPdfBuffer<OfferItem>({
    title: "FINANCIAL OFFER",
    subtitle: model.referenceNumber,
    reserveSignatureSpace: model.settings.includeSignature,
    metadataRows: [
      ["Ref", displayReference],
      ["Client", model.client.name || "-"],
      ["Address", model.client.address || "-"],
      ["Prepared By", model.preparedBy || "-"],
      ["Date", formatBusinessDate(model.generatedAt)],
    ],
    columns: offerColumns(model),
    rows: model.items,
    summarySections: [
      ...(scopeLines.length ? [{ title: "PRICE SUMMARY", lines: scopeLines, startOnNewPage: true }] : []),
      { title: "PRICE SUMMARY", lines: summaryLines(model) },
      ...(terms.length ? [{ title: "Terms & Conditions", lines: terms, startOnNewPage: true }] : []),
    ],
  });
}
