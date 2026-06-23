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
      ["PO Ref", model.referenceNumber],
      ["Original Offer", model.originalOfferReference || "-"],
      ["Client", model.client.name || "-"],
      ["Date", formatBusinessDate(model.generatedAt)],
    ],
    columns: [
      { key: "serial", label: "SL", width: 34, align: "center", render: (item) => String(item.serial) },
      { key: "description", label: "Description", width: 331, render: (item) => item.description || "-" },
      { key: "poPriceUsd", label: "PO Price", width: 56, align: "right", render: (item) => money(item.poPriceUsd) },
      { key: "unit", label: "Unit", width: 56, align: "right", render: (item) => item.unit || "-" },
      { key: "poTotalUsd", label: "Total", width: 58, align: "right", render: (item) => money(item.poTotalUsd) },
    ],
    rows: model.items,
    summarySections: [
      {
        title: "PO Summary",
        lines: [
          `Grand Total: ${money(model.totals.usd)} USD`,
          `Grand Total BDT: ${money(model.totals.bdt)}`,
          `Terms: ${model.terms || "-"}`,
        ],
      },
    ],
  });
}
