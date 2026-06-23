import type { buildPurchaseOrderDocumentModel } from "@/lib/document-generation/purchase-order-document";
import { buildBusinessPdfBuffer } from "@/lib/document-generation/business-pdf";
import { money } from "@/lib/document-generation/basic-pdf";

type PurchaseOrderDocumentModel = ReturnType<typeof buildPurchaseOrderDocumentModel>;
type PurchaseOrderItem = PurchaseOrderDocumentModel["items"][number];

function formatBusinessDate(value: string | Date) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" }).format(date).replace(/ /g, "-");
}

export async function generatePurchaseOrderPdfBuffer(model: PurchaseOrderDocumentModel) {
  return buildBusinessPdfBuffer<PurchaseOrderItem>({
    title: "PURCHASE ORDER",
    subtitle: model.referenceNumber,
    reserveSignatureSpace: process.env.FOS_PO_INCLUDE_SIGNATURE === "true",
    metadataRows: [
      ["PO Reference", model.referenceNumber],
      ["Original Offer", model.originalOfferReference || "-"],
      ["Client", model.client.name || "-"],
      ["Address", model.client.address || "-"],
      ["Prepared By", model.preparedBy || "-"],
      ["Date", formatBusinessDate(model.generatedAt)],
    ],
    columns: [
      { key: "serial", label: "SL", width: 25, align: "center", render: (item) => String(item.serial) },
      { key: "itemCode", label: "Item Code", width: 65, render: (item) => item.itemCode || item.productType || "-" },
      { key: "description", label: "Description", width: 225, render: (item) => item.description || "-" },
      { key: "qty", label: "Qty", width: 38, align: "right", render: (item) => money(Number(item.qty || 0)).replace(".00", "") },
      { key: "unit", label: "Unit", width: 35, render: (item) => item.unit || "-" },
      { key: "poPriceUsd", label: "PO USD", width: 65, align: "right", render: (item) => money(item.poPriceUsd) },
      { key: "poTotalUsd", label: "Total USD", width: 82, align: "right", render: (item) => money(item.poTotalUsd) },
    ],
    rows: model.items,
    summarySections: [
      {
        title: "PO Summary",
        lines: [
          `PO Grand Total USD: ${money(model.totals.usd)}`,
          `PO Grand Total BDT: ${money(model.totals.bdt)}`,
          `Terms: ${model.terms || "-"}`,
        ],
      },
    ],
  });
}
