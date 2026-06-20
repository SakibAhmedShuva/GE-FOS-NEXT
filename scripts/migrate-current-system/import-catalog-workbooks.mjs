#!/usr/bin/env node
import { writeFileSync } from "node:fs";
import { basename, join } from "node:path";
import {
  cleanString,
  ensureDir,
  htmlToPlain,
  sanitizeMinimalHtml,
  toDecimalString,
} from "./common.mjs";

const args = process.argv.slice(2);
const legacyRoot = args[0];
const writeMode = args.includes("--write");
const outputIndex = args.indexOf("--out");
const outPath = outputIndex >= 0 ? args[outputIndex + 1] : "docs/migration/stage-2/catalog-import-dry-run.json";
const markup = Number(process.env.FOS_CATALOG_MARKUP ?? "0.08");

if (!legacyRoot) {
  console.error("Usage: node scripts/migrate-current-system/import-catalog-workbooks.mjs <legacy-root> [--write] [--out docs/migration/stage-2/catalog-import-dry-run.json]");
  process.exit(1);
}

function cellText(cell) {
  const value = cell?.value;
  if (value === null || value === undefined) return "";
  if (typeof value === "object" && Array.isArray(value.richText)) {
    return value.richText.map((part) => part.text ?? "").join("");
  }
  if (typeof value === "object" && value.text) return String(value.text);
  if (typeof value === "object" && value.result !== undefined) return String(value.result);
  return String(value);
}

function escapeHtml(text) {
  return String(text ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function richCellToHtml(cell) {
  const value = cell?.value;
  if (value && typeof value === "object" && Array.isArray(value.richText)) {
    return value.richText
      .map((part) => {
        let text = escapeHtml(part.text ?? "");
        if (part.font?.bold) text = `<strong>${text}</strong>`;
        if (part.font?.italic) text = `<em>${text}</em>`;
        if (part.font?.underline) text = `<u>${text}</u>`;
        return text;
      })
      .join("")
      .replace(/\n/g, "<br/>");
  }
  return escapeHtml(cellText(cell)).replace(/\n/g, "<br/>");
}

function normalizeHeader(value) {
  return String(value ?? "").trim().toLowerCase().replace(/\s+/g, "_");
}

function findHeader(headers, names) {
  for (const name of names) {
    const index = headers.indexOf(name);
    if (index >= 0) return index + 1;
  }
  return null;
}

async function readWorkbookItems({ filepath, sourceType }) {
  const ExcelJS = (await import("exceljs")).default;
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filepath);
  const items = [];
  const errors = [];

  workbook.eachSheet((worksheet) => {
    const headerRow = worksheet.getRow(1);
    const headers = [];
    headerRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      headers[colNumber - 1] = normalizeHeader(cellText(cell));
    });

    const descriptionCol = findHeader(headers, ["description"]);
    const poPriceCol = findHeader(headers, ["po_price"]);

    if (!descriptionCol || !poPriceCol) {
      errors.push({ sheetName: worksheet.name, message: "Missing description or po_price header" });
      return;
    }

    const col = {
      itemCode: findHeader(headers, ["item_code"]),
      make: findHeader(headers, ["make"]),
      productType: findHeader(headers, ["product_type"]),
      approvals: findHeader(headers, ["approvals"]),
      model: findHeader(headers, ["model"]),
      unit: findHeader(headers, ["unit"]),
      installation: findHeader(headers, ["installation"]),
      originalPoPrice: findHeader(headers, ["original_po_price"]),
    };

    worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
      if (rowNumber === 1) return;
      const descriptionHtml = sanitizeMinimalHtml(richCellToHtml(row.getCell(descriptionCol)));
      const descriptionPlain = htmlToPlain(descriptionHtml);
      const poPrice = toDecimalString(cellText(row.getCell(poPriceCol)));
      if (!descriptionPlain || !poPrice || Number(poPrice) <= 0) return;

      const productType = cleanString(col.productType ? cellText(row.getCell(col.productType)) : null) || worksheet.name;
      const po = Number(poPrice);
      const offerPrice = Number.isFinite(po) ? (po * (1 + markup)).toFixed(2) : null;
      const itemCode = cleanString(col.itemCode ? cellText(row.getCell(col.itemCode)) : null) || (sourceType === "LOCAL" ? `local_${worksheet.name}_${rowNumber}` : null);

      items.push({
        sourceType,
        productType,
        itemCode,
        make: cleanString(col.make ? cellText(row.getCell(col.make)) : null),
        approvals: cleanString(col.approvals ? cellText(row.getCell(col.approvals)) : null),
        model: cleanString(col.model ? cellText(row.getCell(col.model)) : null),
        descriptionHtml,
        descriptionPlain,
        poPrice,
        offerPrice,
        installationPrice: toDecimalString(col.installation ? cellText(row.getCell(col.installation)) : null),
        unit: cleanString(col.unit ? cellText(row.getCell(col.unit)) : null) || "Pcs",
        searchText: `${descriptionPlain} ${itemCode || ""} ${productType || ""}`.toLowerCase(),
        metadata: {
          sourceWorkbook: basename(filepath),
          sheetName: worksheet.name,
          rowNumber,
          originalPoPrice: cleanString(col.originalPoPrice ? cellText(row.getCell(col.originalPoPrice)) : null),
        },
      });
    });
  });

  return { items, errors };
}

async function writeItemsToDatabase({ foreignItems, localItems, errors }) {
  if (!writeMode) return;
  const { PrismaClient } = await import("@prisma/client");
  const prisma = new PrismaClient();

  try {
    for (const source of [
      { sourceType: "FOREIGN", filename: "Price List 2017-Rev-Edited -All Item 2018.xlsx", items: foreignItems },
      { sourceType: "LOCAL", filename: "local_items.xlsx", items: localItems },
    ]) {
      const importRow = await prisma.priceListImport.create({
        data: {
          sourceType: source.sourceType,
          filename: source.filename,
          status: "IMPORTED",
          rowCount: source.items.length,
          errorCount: errors.filter((error) => error.workbook === source.filename).length,
        },
      });

      for (const item of source.items) {
        await prisma.catalogItem.create({
          data: {
            ...item,
            importId: importRow.id,
          },
        });
      }
    }
  } finally {
    await prisma.$disconnect();
  }
}

const foreignPath = join(legacyRoot, "Price List 2017-Rev-Edited -All Item 2018.xlsx");
const localPath = join(legacyRoot, "local_items.xlsx");

const foreign = await readWorkbookItems({ filepath: foreignPath, sourceType: "FOREIGN" });
const local = await readWorkbookItems({ filepath: localPath, sourceType: "LOCAL" });
const errors = [
  ...foreign.errors.map((error) => ({ workbook: basename(foreignPath), ...error })),
  ...local.errors.map((error) => ({ workbook: basename(localPath), ...error })),
];

await writeItemsToDatabase({ foreignItems: foreign.items, localItems: local.items, errors });

const report = {
  generatedAt: new Date().toISOString(),
  sourceRoot: legacyRoot,
  writeMode,
  markup,
  summary: {
    foreignItems: foreign.items.length,
    localItems: local.items.length,
    totalItems: foreign.items.length + local.items.length,
    workbookErrors: errors.length,
  },
  errors,
  samples: {
    foreign: foreign.items.slice(0, 3),
    local: local.items.slice(0, 3),
  },
};

ensureDir(outPath.split("/").slice(0, -1).join("/") || ".");
writeFileSync(outPath, JSON.stringify(report, null, 2));
console.log(JSON.stringify({ outPath, ...report.summary }, null, 2));
