#!/usr/bin/env node
import { createHash } from "node:crypto";
import { existsSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { basename, extname, join, relative } from "node:path";
import { readdirSync } from "node:fs";

const [oldRoot, newRoot, outPath = "docs/migration/golden-document-comparison.json"] = process.argv.slice(2);
if (!oldRoot || !newRoot) {
  console.error("Usage: node scripts/compare-golden-documents.mjs <old-generated-root> <new-generated-root> [out.json]");
  process.exit(1);
}

function walk(dir) {
  if (!existsSync(dir)) return [];
  const entries = [];
  for (const name of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, name.name);
    if (name.isDirectory()) entries.push(...walk(path));
    else if (/\.(pdf|xlsx)$/i.test(name.name)) entries.push(path);
  }
  return entries;
}

function normalizeName(file) {
  return basename(file).toLowerCase().replace(/\s+/g, " ").replace(/[_-]?\d{8,14}(?=\.)/g, "").trim();
}

function sha256(path) {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

function pdfPageCount(path) {
  if (!/\.pdf$/i.test(path)) return null;
  const text = readFileSync(path).toString("latin1");
  const matches = text.match(/\/Type\s*\/Page\b/g);
  return matches ? matches.length : null;
}

async function xlsxWorksheetNames(path) {
  if (!/\.xlsx$/i.test(path)) return null;
  try {
    const ExcelJS = (await import("exceljs")).default;
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(path);
    return workbook.worksheets.map((sheet) => sheet.name);
  } catch (error) {
    return [`ERROR: ${error instanceof Error ? error.message : "Unable to read workbook"}`];
  }
}

async function fileInfo(path, root) {
  const stat = statSync(path);
  return {
    path: relative(root, path),
    filename: basename(path),
    sizeBytes: stat.size,
    sha256: sha256(path),
    pdfPageCount: pdfPageCount(path),
    worksheets: await xlsxWorksheetNames(path),
  };
}

const oldFiles = walk(oldRoot);
const newFiles = walk(newRoot);
const oldByName = new Map(oldFiles.map((file) => [normalizeName(file), file]));
const newByName = new Map(newFiles.map((file) => [normalizeName(file), file]));
const allNames = Array.from(new Set([...oldByName.keys(), ...newByName.keys()])).sort();

const pairs = [];
const missingInNew = [];
const missingInOld = [];

for (const name of allNames) {
  const oldFile = oldByName.get(name);
  const newFile = newByName.get(name);
  if (oldFile && newFile) {
    const oldInfo = await fileInfo(oldFile, oldRoot);
    const newInfo = await fileInfo(newFile, newRoot);
    pairs.push({
      normalizedName: name,
      extension: extname(name).toLowerCase(),
      old: oldInfo,
      new: newInfo,
      sameHash: oldInfo.sha256 === newInfo.sha256,
      sameSize: oldInfo.sizeBytes === newInfo.sizeBytes,
      samePdfPageCount: oldInfo.pdfPageCount === newInfo.pdfPageCount,
      sameWorksheets: JSON.stringify(oldInfo.worksheets) === JSON.stringify(newInfo.worksheets),
    });
  } else if (oldFile) {
    missingInNew.push(await fileInfo(oldFile, oldRoot));
  } else if (newFile) {
    missingInOld.push(await fileInfo(newFile, newRoot));
  }
}

const report = {
  generatedAt: new Date().toISOString(),
  oldRoot,
  newRoot,
  summary: {
    oldFileCount: oldFiles.length,
    newFileCount: newFiles.length,
    matchedPairs: pairs.length,
    missingInNew: missingInNew.length,
    missingInOld: missingInOld.length,
    pdfPageCountMismatches: pairs.filter((pair) => pair.extension === ".pdf" && !pair.samePdfPageCount).length,
    worksheetMismatches: pairs.filter((pair) => pair.extension === ".xlsx" && !pair.sameWorksheets).length,
    exactHashMatches: pairs.filter((pair) => pair.sameHash).length,
  },
  pairs,
  missingInNew,
  missingInOld,
};

writeFileSync(outPath, JSON.stringify(report, null, 2));
console.log(JSON.stringify(report.summary, null, 2));
console.log(`Report written to ${outPath}`);
