import type { buildOfferDocumentModel } from "@/lib/document-generation/offer-document";
import { buildBasicPdfBuffer, money, section } from "@/lib/document-generation/basic-pdf";

type OfferDocumentModel = ReturnType<typeof buildOfferDocumentModel>;

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

export function generateOfferPdfBuffer(model: OfferDocumentModel) {
  const itemLines = model.items.flatMap((item) => [
    `${item.serial}. ${item.itemCode || item.productType || "Item"} | Qty ${item.qty} ${item.unit} | Make ${item.make || "-"} | Model ${item.model || "-"}`,
    `   ${item.description}`,
    `   Foreign USD ${money(item.foreignPriceUsd)} / Total ${money(item.foreignTotalUsd)} | Local BDT ${money(item.localSupplyPriceBdt)} / Total ${money(item.localSupplyTotalBdt)} | Installation BDT ${money(item.installationPriceBdt)} / Total ${money(item.installationTotalBdt)} | PO USD ${money(item.poPriceUsd)} / Total ${money(item.poTotalUsd)}`,
  ]);

  const terms = termsLines(model);
  const lines = [
    "FINANCIAL OFFER",
    `Reference: ${model.referenceNumber}`,
    `Client: ${model.client.name}`,
    `Address: ${model.client.address}`,
    `Prepared By: ${model.preparedBy}`,
    `Generated: ${new Date(model.generatedAt).toLocaleString()}`,
    ...section("Items", itemLines),
    ...section("Financial Summary", [
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
    ]),
    ...(terms.length ? section("Terms & Conditions", terms) : []),
    ...(model.settings.includeSignature ? section("Authorization", ["Authorized signature included."]) : []),
  ];

  return buildBasicPdfBuffer({ lines, maxLinesPerPage: 44, maxChars: 120 });
}
