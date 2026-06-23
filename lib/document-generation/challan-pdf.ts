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
  const challanNo = model.referenceNumber.startsWith("DC_") ? model.referenceNumber.split("_")[1] || model.referenceNumber : model.referenceNumber;
  return buildBusinessPdfBuffer<ChallanItem>({
    title: "DELIVERY CHALLAN",
    subtitle: model.referenceNumber,
    reserveSignatureSpace: model.includeSignature,
    metadataRows: [
      ["Challan No", challanNo],
      ["Date", formatBusinessDate(model.challanDate)],
      ["Client", model.client.name || "-"],
      ["Address", model.client.address || "-"],
    ],
    columns: [
      { key: "serial", label: "SL", width: 42, align: "center", render: (item) => String(item.serial) },
      { key: "description", label: "Item Description", width: 352, render: (item) => item.description || "-" },
      { key: "qty", label: "Quantity", width: 70, align: "center", render: (item) => money(Number(item.qty || 0)).replace(".00", "") },
      { key: "unit", label: "Unit", width: 70, align: "center", render: (item) => item.unit || "-" },
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
