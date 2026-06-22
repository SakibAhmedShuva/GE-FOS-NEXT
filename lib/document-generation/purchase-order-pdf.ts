import type { buildPurchaseOrderDocumentModel } from "@/lib/document-generation/purchase-order-document";
import { buildBasicPdfBuffer, money, section } from "@/lib/document-generation/basic-pdf";

type PurchaseOrderDocumentModel = ReturnType<typeof buildPurchaseOrderDocumentModel>;

export function generatePurchaseOrderPdfBuffer(model: PurchaseOrderDocumentModel) {
  const itemLines = model.items.flatMap((item: PurchaseOrderDocumentModel["items"][number]) => [
    `${item.serial}. ${item.itemCode || item.productType || "Item"} | Qty ${item.qty} ${item.unit} | Make ${item.make || "-"} | Model ${item.model || "-"}`,
    `   ${item.description}`,
    `   PO USD ${money(item.poPriceUsd)} / Total ${money(item.poTotalUsd)} | PO BDT ${money(item.poPriceBdt)} / Total ${money(item.poTotalBdt)}`,
  ]);

  const lines = [
    "PURCHASE ORDER",
    `PO Reference: ${model.referenceNumber}`,
    `Original Offer: ${model.originalOfferReference || "-"}`,
    `Client: ${model.client.name}`,
    `Address: ${model.client.address}`,
    `Prepared By: ${model.preparedBy}`,
    `Generated: ${new Date(model.generatedAt).toLocaleString()}`,
    ...section("Items", itemLines),
    ...section("PO Summary", [
      `PO Grand Total USD: ${money(model.totals.usd)}`,
      `PO Grand Total BDT: ${money(model.totals.bdt)}`,
      `Terms: ${model.terms || "-"}`,
    ]),
  ];

  return buildBasicPdfBuffer({ lines, maxLinesPerPage: 44, maxChars: 120 });
}
