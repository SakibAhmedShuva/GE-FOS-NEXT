import type { buildOfferDocumentModel } from "@/lib/document-generation/offer-document";
import { buildBusinessPdfBuffer } from "@/lib/document-generation/business-pdf";
import { money } from "@/lib/document-generation/basic-pdf";

type OfferDocumentModel = ReturnType<typeof buildOfferDocumentModel>;
type OfferItem = OfferDocumentModel["items"][number];

function termsLines(model: OfferDocumentModel) {
  const tnc = model.settings.tncState as Record<string, unknown>;
  const lines: string[] = [];
  if (tnc.international) lines.push("International supply terms apply.");
  if (tnc.local_supply) lines.push("Local supply terms apply.");
  if (tnc.local_installation) lines.push("Installation terms apply.");
  const custom = typeof tnc.value === "string" ? tnc.value.trim() : "";
  if (custom) lines.push(...custom.split(/\r?\n/).map((line) => line.trim()).filter(Boolean));
  return lines;
}

export async function generateOfferPdfBuffer(model: OfferDocumentModel) {
  const terms = termsLines(model);
  return buildBusinessPdfBuffer<OfferItem>({
    title: "FINANCIAL OFFER",
    subtitle: model.referenceNumber,
    metadataRows: [
      ["Reference", model.referenceNumber],
      ["Client", model.client.name || "-"],
      ["Address", model.client.address || "-"],
      ["Prepared By", model.preparedBy || "-"],
      ["Generated", new Date(model.generatedAt).toLocaleString()],
    ],
    columns: [
      { key: "serial", label: "SL", width: 24, align: "center", render: (item) => String(item.serial) },
      { key: "itemCode", label: "Item Code", width: 52, render: (item) => item.itemCode || "-" },
      { key: "description", label: "Description", width: 160, render: (item) => item.description || "-" },
      { key: "qty", label: "Qty", width: 30, align: "right", render: (item) => money(Number(item.qty || 0)).replace(".00", "") },
      { key: "unit", label: "Unit", width: 28, render: (item) => item.unit || "-" },
      { key: "make", label: "Make/Model", width: 55, render: (item) => [item.make, item.model].filter(Boolean).join(" / ") || "-" },
      { key: "foreignPriceUsd", label: "Unit USD", width: 45, align: "right", render: (item) => money(item.foreignPriceUsd) },
      { key: "foreignTotalUsd", label: "Total USD", width: 50, align: "right", render: (item) => money(item.foreignTotalUsd) },
      { key: "localSupplyTotalBdt", label: "Local BDT", width: 45, align: "right", render: (item) => money(item.localSupplyTotalBdt) },
      { key: "installationTotalBdt", label: "Install BDT", width: 46, align: "right", render: (item) => money(item.installationTotalBdt) },
    ],
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
      ...(terms.length ? [{ title: "Terms & Conditions", lines: terms }] : []),
      ...(model.settings.includeSignature ? [{ title: "Authorization", lines: ["Authorized signature area reserved."] }] : []),
    ],
  });
}
