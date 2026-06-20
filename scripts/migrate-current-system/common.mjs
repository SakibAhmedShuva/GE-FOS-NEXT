import { existsSync, mkdirSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

export function readText(path) {
  try {
    return readFileSync(path, "utf8").replace(/^\uFEFF/, "");
  } catch {
    return "";
  }
}

export function ensureDir(path) {
  mkdirSync(path, { recursive: true });
}

export function walkFiles(dir) {
  if (!existsSync(dir)) return [];
  const out = [];
  const stack = [dir];
  while (stack.length) {
    const current = stack.pop();
    for (const name of readdirSync(current)) {
      const full = join(current, name);
      const stats = statSync(full);
      if (stats.isDirectory()) stack.push(full);
      else out.push(full);
    }
  }
  return out;
}

export function parseCsvTolerant(path, options = {}) {
  if (!existsSync(path)) return { exists: false, header: [], records: [], malformedRows: [] };
  const text = readText(path);
  const rows = [];
  let row = [];
  let cell = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    const next = text[i + 1];
    if (ch === '"') {
      if (inQuotes && next === '"') {
        cell += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (ch === "," && !inQuotes) {
      row.push(cell);
      cell = "";
      continue;
    }
    if ((ch === "\n" || ch === "\r") && !inQuotes) {
      if (ch === "\r" && next === "\n") i += 1;
      row.push(cell);
      if (row.some((value) => value.length > 0)) rows.push(row);
      row = [];
      cell = "";
      continue;
    }
    cell += ch;
  }

  if (cell.length || row.length) {
    row.push(cell);
    if (row.some((value) => value.length > 0)) rows.push(row);
  }

  const header = rows[0] || [];
  const malformedRows = [];
  const records = rows.slice(1).map((rawValues, index) => {
    let values = rawValues;
    if (options.coalesceExtraColumns && header.length && rawValues.length > header.length) {
      values = [
        ...rawValues.slice(0, header.length - 1),
        rawValues.slice(header.length - 1).join(options.coalesceSeparator ?? ","),
      ];
    }
    if (values.length !== header.length) {
      malformedRows.push({ rowNumber: index + 2, expectedColumns: header.length, actualColumns: values.length, values: rawValues });
    }
    const record = {};
    header.forEach((name, cellIndex) => {
      record[name] = values[cellIndex] ?? "";
    });
    return record;
  });

  return { exists: true, header, records, malformedRows };
}

export function parseJsonFile(path) {
  try {
    return { ok: true, data: JSON.parse(readText(path)) };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}

export function cleanString(value) {
  if (value === null || value === undefined) return null;
  const text = String(value).replace(/\u0000/g, "").trim();
  return text.length ? text : null;
}

export function toDecimalString(value) {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  const normalized = String(value).replace(/,/g, "").trim();
  if (!normalized) return null;
  const num = Number(normalized);
  return Number.isFinite(num) ? normalized : null;
}

export function toInt(value) {
  const num = Number.parseInt(String(value ?? "").trim(), 10);
  return Number.isFinite(num) ? num : null;
}

export function parseLegacyDate(value) {
  const text = cleanString(value);
  if (!text) return null;
  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function htmlToPlain(input) {
  return String(input ?? "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function sanitizeMinimalHtml(input) {
  if (!input) return null;
  return String(input)
    .replace(/<\s*(script|style|iframe)[\s\S]*?<\s*\/\s*\1\s*>/gi, "")
    .replace(/\s+on[a-zA-Z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/g, "")
    .trim();
}

export function mapProjectType(value) {
  const normalized = String(value ?? "offer").toLowerCase().trim();
  if (normalized === "challan") return "CHALLAN";
  if (normalized === "purchase_order" || normalized === "purchase-order" || normalized === "po") return "PURCHASE_ORDER";
  if (normalized === "ai_helper" || normalized === "ai-helper") return "AI_HELPER";
  return "OFFER";
}

export function mapStatus(value) {
  const normalized = String(value ?? "Pending").toLowerCase().trim();
  if (normalized === "delivered") return "DELIVERED";
  if (normalized === "archived") return "ARCHIVED";
  return "PENDING";
}

export function mapSourceType(value, item = {}) {
  const normalized = String(value ?? "").toLowerCase().trim();
  if (normalized === "local") return "LOCAL";
  if (normalized === "custom") return "CUSTOM";
  if (item.is_local === true) return "LOCAL";
  if (item.isCustom === true || typeof item.isCustom === "object") return normalized === "local" ? "LOCAL" : "CUSTOM";
  return "FOREIGN";
}

export function relativeKey(root, file) {
  return relative(root, file).replace(/\\/g, "/");
}

export function normalizeEmail(value) {
  const email = cleanString(value);
  return email ? email.toLowerCase() : null;
}

export function createImportSummary() {
  return {
    users: 0,
    clients: 0,
    projects: 0,
    projectItems: 0,
    offerSettings: 0,
    shares: 0,
    reviewRequests: 0,
    notifications: 0,
    chatMessages: 0,
    covers: 0,
    generatedExportsMatched: 0,
    generatedExportsUnmatched: 0,
    activityRows: 0,
    migrationErrors: 0,
  };
}
