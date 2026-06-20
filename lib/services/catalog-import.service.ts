import ExcelJS from "exceljs";
import { prisma } from "@/lib/db/prisma";
import { sanitizeLegacyRichText, richTextToPlainText } from "@/lib/validators/sanitize-html";

type SourceType = "FOREIGN" | "LOCAL";

type ParsedCatalogItem = {
  sourceType: SourceType;
  productType: string | null;
  itemCode: string | null;
  make: string | null;
  approvals: string | null;
  model: string | null;
  descriptionHtml: string;
  descriptionPlain: string;
  poPrice: string | null;
  offerPrice: string | null;
  installationPrice: string | null;
  unit: string | null;
  searchText: string;
  metadata: Record<string, unknown>;
};

type ParsedImportError = {
  rowNumber?: number;
  sheetName?: string;
  message: string;
  rawData?: Record<string, unknown>;
};

const HEADER_ALIASES = {
  description: ["description", "item_description", "desc", "item", "particulars"],
  poPrice: ["po_price", "p.o_price", "p_o_price", "po", "price", "unit_price", "rate"],
  offerPrice: ["offer_price", "offer", "selling_price"],
  itemCode: ["item_code", "code", "model_code", "product_code"],
  productType: ["product_type", "type", "category"],
  make: ["make", "brand"],
  approvals: ["approvals", "approval", "approved_by"],
  model: ["model", "model_no", "model_number"],
  unit: ["unit", "uom"],
  installation: ["installation", "installation_price", "install", "install_price"],
} as const;

function cleanString(value: unknown) {
  const text = String(value ?? "").replace(/\s+/g, " ").trim();
  return text || null;
}

function cellText(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "object" && "text" in value) return String((value as { text?: unknown }).text || "");
  if (typeof value === "object" && "result" in value) return String((value as { result?: unknown }).result || "");
  if (typeof value === "object" && "richText" in value) {
    return ((value as { richText?: Array<{ text?: string }> }).richText || []).map((part) => part.text || "").join("");
  }
  return String(value).trim();
}

function escapeHtml(text: string) {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}

function cellHtml(cell: ExcelJS.Cell) {
  const value = cell.value;
  if (value && typeof value === "object" && "richText" in value) {
    return ((value as { richText?: Array<{ text?: string; font?: { bold?: boolean; italic?: boolean; underline?: boolean | string } }> }).richText || [])
      .map((part) => {
        let text = escapeHtml(part.text || "");
        if (part.font?.bold) text = `<strong>${text}</strong>`;
        if (part.font?.italic) text = `<em>${text}</em>`;
        if (part.font?.underline) text = `<u>${text}</u>`;
        return text;
      })
      .join("")
      .replace(/\n/g, "<br/>");
  }
  return escapeHtml(cellText(value)).replace(/\n/g, "<br/>");
}

function normalizeHeader(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
}

function findHeader(headers: string[], aliases: readonly string[]) {
  for (const alias of aliases) {
    const exact = headers.indexOf(alias);
    if (exact >= 0) return exact + 1;
  }
  for (const alias of aliases) {
    const partial = headers.findIndex((header) => header.includes(alias));
    if (partial >= 0) return partial + 1;
  }
  return null;
}

function toDecimalString(value: unknown) {
  const raw = String(value ?? "").replace(/,/g, "").trim();
  if (!raw) return null;
  const match = raw.match(/-?\d+(\.\d+)?/);
  if (!match) return null;
  const number = Number(match[0]);
  if (!Number.isFinite(number)) return null;
  return number.toFixed(4);
}

function rowRawData(row: ExcelJS.Row) {
  const raw: Record<string, unknown> = {};
  row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
    const text = cellText(cell.value);
    if (text) raw[`C${colNumber}`] = text;
  });
  return raw;
}

export async function importCatalogWorkbook({ file, sourceType, uploadedById }: { file: File; sourceType: SourceType; uploadedById: string }) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(Buffer.from(await file.arrayBuffer()) as never);

  const parsedItems: ParsedCatalogItem[] = [];
  const parsedErrors: ParsedImportError[] = [];

  workbook.eachSheet((worksheet) => {
    const headerRow = worksheet.getRow(1);
    const headers: string[] = [];
    headerRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      headers[colNumber - 1] = normalizeHeader(cellText(cell.value));
    });

    const descriptionCol = findHeader(headers, HEADER_ALIASES.description);
    const poPriceCol = findHeader(headers, HEADER_ALIASES.poPrice);
    const offerPriceCol = findHeader(headers, HEADER_ALIASES.offerPrice);
    const columns = {
      itemCode: findHeader(headers, HEADER_ALIASES.itemCode),
      productType: findHeader(headers, HEADER_ALIASES.productType),
      make: findHeader(headers, HEADER_ALIASES.make),
      approvals: findHeader(headers, HEADER_ALIASES.approvals),
      model: findHeader(headers, HEADER_ALIASES.model),
      unit: findHeader(headers, HEADER_ALIASES.unit),
      installation: findHeader(headers, HEADER_ALIASES.installation),
    };

    if (!descriptionCol || (!poPriceCol && !offerPriceCol)) {
      parsedErrors.push({ sheetName: worksheet.name, message: "Missing required description and price headers" });
      return;
    }

    worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
      if (rowNumber === 1) return;
      const descriptionHtml = sanitizeLegacyRichText(cellHtml(row.getCell(descriptionCol)));
      const descriptionPlain = richTextToPlainText(descriptionHtml);
      if (!descriptionPlain) return;

      const poPrice = poPriceCol ? toDecimalString(cellText(row.getCell(poPriceCol).value)) : null;
      const offerPriceFromSheet = offerPriceCol ? toDecimalString(cellText(row.getCell(offerPriceCol).value)) : null;
      const offerPrice = offerPriceFromSheet || poPrice;
      if (!poPrice && !offerPrice) {
        parsedErrors.push({ rowNumber, sheetName: worksheet.name, message: "Skipped row without PO/offer price", rawData: rowRawData(row) });
        return;
      }

      const itemCode = cleanString(columns.itemCode ? cellText(row.getCell(columns.itemCode).value) : null);
      const productType = cleanString(columns.productType ? cellText(row.getCell(columns.productType).value) : null) || worksheet.name;
      const make = cleanString(columns.make ? cellText(row.getCell(columns.make).value) : null);
      const approvals = cleanString(columns.approvals ? cellText(row.getCell(columns.approvals).value) : null);
      const model = cleanString(columns.model ? cellText(row.getCell(columns.model).value) : null);
      const unit = cleanString(columns.unit ? cellText(row.getCell(columns.unit).value) : null) || "Pcs";
      const installationPrice = columns.installation ? toDecimalString(cellText(row.getCell(columns.installation).value)) : null;
      const searchText = [itemCode, productType, make, approvals, model, descriptionPlain].filter(Boolean).join(" ").toLowerCase();

      parsedItems.push({
        sourceType,
        productType,
        itemCode,
        make,
        approvals,
        model,
        descriptionHtml,
        descriptionPlain,
        poPrice,
        offerPrice,
        installationPrice,
        unit,
        searchText,
        metadata: { sheetName: worksheet.name, rowNumber, importedFilename: file.name },
      });
    });
  });

  const importRecord = await prisma.priceListImport.create({
    data: {
      sourceType,
      filename: file.name,
      uploadedById,
      status: parsedErrors.length ? "IMPORTED_WITH_ERRORS" : "IMPORTED",
      rowCount: parsedItems.length,
      errorCount: parsedErrors.length,
    },
  });

  if (parsedItems.length) {
    await prisma.catalogItem.createMany({
      data: parsedItems.map((item) => ({ ...item, importId: importRecord.id })),
    });
  }

  if (parsedErrors.length) {
    await prisma.priceListImportError.createMany({
      data: parsedErrors.map((error) => ({
        importId: importRecord.id,
        rowNumber: error.rowNumber || null,
        sheetName: error.sheetName || null,
        message: error.message,
        rawData: (error.rawData || {}) as never,
      })),
    });
  }

  await prisma.activityLog.create({
    data: {
      actorUserId: uploadedById,
      action: "price_list_imported",
      entityType: "price_list_import",
      entityId: importRecord.id,
      metadata: { sourceType, filename: file.name, rowCount: parsedItems.length, errorCount: parsedErrors.length },
    },
  });

  return {
    import: importRecord,
    report: {
      worksheetCount: workbook.worksheets.length,
      rowCount: parsedItems.length,
      errorCount: parsedErrors.length,
      errors: parsedErrors.slice(0, 50),
    },
  };
}
