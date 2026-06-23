import type { buildChallanDocumentModel } from "@/lib/document-generation/challan-document";
import { buildBusinessPdfBuffer } from "@/lib/document-generation/business-pdf";
import { money } from "@/lib/document-generation/basic-pdf";

type ChallanDocumentModel = ReturnType<typeof buildChallanDocumentModel>;
type ChallanItem = ChallanDocumentModel["items"][number];

function formatBusinessDate(value: string | Date) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value || "");
  return new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" }).format(date).replace(/ /g, "-");
}

export async function generateChallanPdfBuffer(model: ChallanDocumentModel) {
  return buildBusinessPdfBuffer<ChallanItem>({
    title: "CHALLAN",
    subtitle: model.referenceNumber,
    reserveSignatureSpace: model.includeSignature,
    metadataRows: [
      ["Reference", model.referenceNumber],
      ["Date", formatBusinessDate(model.challanDate)],
      ["Client", model.client.name || "-"],
      ["Address", model.client.address || "-"],
      ["Carrier", model.challanCarrier || "-"],
      ["Prepared By", model.preparedBy || "-"],
    ],
    columns: [
      { key: "serial", label: "SL", width: 30, align: "center", render: (item) => String(item.serial) },
      { key: "itemCode", label: "Item Code", width: 82, render: (item) => item.itemCode || item.productType || "-" },
      { key: "description", label: "Description", width: 315, render: (item) => item.description || "-" },
      { key: "qty", label: "Qty", width: 50, align: "right", render: (item) => money(Number(item.qty || 0)).replace(".00", "") },
      { key: "unit", label: "Unit", width: 58, render: (item) => item.unit || "-" },
    ],
    rows: model.items,
    summarySections: [
      {
        title: "Delivery / Receipt",
        lines: [
          `Signed Copy Received: ${model.signedCopyReceived || "-"}`,
          `Remarks: ${model.remarks || "-"}`,
          `Prepared By: ${model.preparedBy || "-"}`,
        ],
      },
    ],
  });
}
