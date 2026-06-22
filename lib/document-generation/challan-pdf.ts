import type { buildChallanDocumentModel } from "@/lib/document-generation/challan-document";
import { buildBasicPdfBuffer, section } from "@/lib/document-generation/basic-pdf";

type ChallanDocumentModel = ReturnType<typeof buildChallanDocumentModel>;

export function generateChallanPdfBuffer(model: ChallanDocumentModel) {
  const itemLines = model.items.flatMap((item: ChallanDocumentModel["items"][number]) => [
    `${item.serial}. ${item.itemCode || item.productType || "Item"} | Qty ${item.qty} ${item.unit}`,
    `   ${item.description}`,
  ]);

  const lines = [
    "CHALLAN",
    `Reference: ${model.referenceNumber}`,
    `Date: ${model.challanDate}`,
    `Client: ${model.client.name}`,
    `Address: ${model.client.address}`,
    `Carrier: ${model.challanCarrier}`,
    ...section("Items", itemLines),
    ...section("Delivery / Receipt", [
      `Signed Copy Received: ${model.signedCopyReceived}`,
      `Remarks: ${model.remarks}`,
      `Prepared By: ${model.preparedBy}`,
      `Signature Included: ${model.includeSignature ? "Yes" : "No"}`,
    ]),
  ];

  return buildBasicPdfBuffer({ lines, maxLinesPerPage: 46, maxChars: 120 });
}
