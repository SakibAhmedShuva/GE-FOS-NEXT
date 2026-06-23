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

function offerColumns(model: OfferDocumentModel): BusinessPdfColumn<OfferItem>[] {
  const columns: BusinessPdfColumn<OfferItem>[] = [
    { key: "serial", label: "SL", width: 24, align: "center", render: (item) => String(item.serial) },
  ];
  if (isVisible(model, ["itemCode", "code", "showItemCode"])) columns.push({ key: "itemCode", label: "Item Code", width: 52, render: (item) => item.itemCode || "-" });
  columns.push({ key: "description", label: "Description", width: 170, render: (item) => item.description || "-" });
  if (isVisible(model, ["qty", "quantity", "showQty"])) columns.push({ key: "qty", label: "Qty", width: 30, align: "right", render: (item) => money(Number(item.qty || 0)).replace(".00", "") });
  if (isVisible(model, ["unit", "showUnit"])) columns.push({ key: "unit", label: "Unit", width: 28, render: (item) => item.unit || "-" });
  if (isVisible(model, ["make", "model", "makeModel", "showMakeModel"])) columns.push({ key: "make", label: "Make/Model", width: 55, render: (item) => [item.make, item.model].filter(Boolean).join(" / ") || "-" });
  if (isVisible(model, ["foreignPriceUsd", "foreignUnitPrice", "unitUsd", "foreign", "showForeignPrice"])) columns.push({ key: "foreignPriceUsd", label: "Unit USD", width: 45, align: "right", render: (item) => money(item.foreignPriceUsd) });
  if (isVisible(model, ["foreignTotalUsd", "foreignTotal", "totalUsd", "foreign", "showForeignTotal"])) columns.push({ key: "foreignTotalUsd", label: "Total USD", width: 50, align: "right", render: (item) => money(item.foreignTotalUsd) });
  if (isVisible(model, ["localSupplyTotalBdt", "localSupply", "local", "showLocalSupply"])) columns.push({ key: "localSupplyTotalBdt", label: "Local BDT", width: 45, align: "right", render: (item) => money(item.localSupplyTotalBdt) });
  if (isVisible(model, ["installationTotalBdt", "installation", "install", "showInstallation"])) columns.push({ key: "installationTotalBdt", label: "Install BDT", width: 46, align: "right", render: (item) => money(item.installationTotalBdt) });
  if (isVisible(model, ["poTotalUsd", "po", "poPriceUsd", "showPo"], false)) columns.push({ key: "poTotalUsd", label: "PO USD", width: 45, align: "right", render: (item) => money(item.poTotalUsd) });
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

function summaryScopeLines(model: OfferDocumentModel) {
  if (!model.settings.isSummaryPageEnabled) return [];
  const scopes = model.settings.summaryScopeDescriptions as Record<string, unknown>;
  return Object.entries(scopes || {})
    .filter(([, value]) => String(value ?? "").trim())
    .map(([key, value]) => `${key}: ${String(value)}`);
}

export async function generateOfferPdfBuffer(model: OfferDocumentModel) {
  const terms = termsLines(model);
  const scopeLines = summaryScopeLines(model);
  return buildBusinessPdfBuffer<OfferItem>({
    title: "FINANCIAL OFFER",
    subtitle: model.referenceNumber,
    reserveSignatureSpace: model.settings.includeSignature,
    metadataRows: [
      ["Reference", model.referenceNumber],
      ["Client", model.client.name || "-"],
      ["Address", model.client.address || "-"],
      ["Prepared By", model.preparedBy || "-"],
      ["Date", formatBusinessDate(model.generatedAt)],
    ],
    columns: offerColumns(model),
    rows: model.items,
    summarySections: [
      {
        title: "Financial Summary",
        lines: [
          `Subtotal Foreign USD: ${money(model.totals.subtotals.foreignUsd)}`,
          `${model.labels.grandtotalForeign}: ${money(model.totals.grandTotals.foreignUsd)}`,
          `PO Grand Total USD: ${money(model.totals.grandTotals.poUsd)}`,
          `Local Supply Grand Total BDT: ${money(model.totals.grandTotals.localSupplyBdt)}`,
          `Installation Grand Total BDT: ${money(model.totals.grandTotals.installationBdt)}`,
          `BDT Conversion Rate: ${money(model.config.bdt_conversion_rate)}`,
          `Customs Duty Percentage: ${money(model.config.customs_duty_percentage)}%`,
          `Total In BDT: ${money(model.totals.adjustments.totalInBdt)}`,
          `Customs Duty BDT: ${money(model.totals.adjustments.customsDutyBdt)}`,
          `Foreign Grand Total With Customs BDT: ${money(model.totals.grandTotals.foreignGrandTotalBdt)}`,
          `Amount In Words: ${model.amountInWords.foreignGrandTotalBdt}`,
        ],
      },
      ...(scopeLines.length ? [{ title: "Scope Summary", lines: scopeLines, startOnNewPage: true }] : []),
      ...(terms.length ? [{ title: "Terms & Conditions", lines: terms, startOnNewPage: true }] : []),
    ],
  });
}
