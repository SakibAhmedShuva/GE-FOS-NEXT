#!/usr/bin/env node
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { basename, dirname, extname, join, relative } from "node:path";

const [legacyRootArg, outputArg = "docs/migration/latest-audit.json"] = process.argv.slice(2);

if (!legacyRootArg) {
  console.error("Usage: node scripts/audit-legacy-system.mjs <legacy-root> [output-json]");
  process.exit(1);
}

const legacyRoot = legacyRootArg.replace(/[\\/]$/, "");

if (!existsSync(legacyRoot)) {
  console.error(`Legacy root does not exist: ${legacyRoot}`);
  process.exit(1);
}

const readText = (path) => {
  try {
    return readFileSync(path, "utf8");
  } catch {
    return "";
  }
};

const walkFiles = (dir) => {
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
};

const parseCsvTolerant = (path) => {
  if (!existsSync(path)) return { exists: false, header: [], rowCount: 0, malformedRows: [] };
  const text = readText(path).replace(/^\uFEFF/, "");
  const rows = [];
  let row = [];
  let cell = "";
  let inQuotes = false;
  const malformedRows = [];

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
  rows.slice(1).forEach((r, index) => {
    if (header.length && r.length !== header.length) {
      malformedRows.push({ rowNumber: index + 2, expectedColumns: header.length, actualColumns: r.length, raw: r });
    }
  });

  return { exists: true, header, rowCount: Math.max(0, rows.length - 1), malformedRows };
};

const countFiles = (dir, predicate = () => true) => walkFiles(dir).filter(predicate).length;

const parseRoutes = () => {
  const appPy = join(legacyRoot, "app.py");
  const text = readText(appPy);
  const routes = [];
  const routeRegex = /@app\.route\((.*?)\)\s*\n\s*def\s+(\w+)/gs;
  let routeMatch;
  while ((routeMatch = routeRegex.exec(text))) {
    routes.push({ decorator: routeMatch[1].replace(/\s+/g, " ").trim(), functionName: routeMatch[2] });
  }

  const socketEvents = [];
  const socketRegex = /@socketio\.on\(['"]([^'"]+)['"]\)\s*\n\s*def\s+(\w+)/g;
  let socketMatch;
  while ((socketMatch = socketRegex.exec(text))) {
    socketEvents.push({ event: socketMatch[1], functionName: socketMatch[2] });
  }

  return { routes, socketEvents };
};

const parseProjects = () => {
  const projectsDir = join(legacyRoot, "data_storage", "projects");
  const files = walkFiles(projectsDir).filter((file) => extname(file).toLowerCase() === ".json");
  const malformed = [];
  const keyCoverage = {};
  const typeCoverage = {};
  const statusCoverage = {};
  const duplicateReferences = {};
  const references = new Map();

  for (const file of files) {
    try {
      const raw = readText(file);
      const parsed = JSON.parse(raw);
      Object.keys(parsed).forEach((key) => {
        keyCoverage[key] = (keyCoverage[key] || 0) + 1;
      });
      const projectType = parsed.projectType || parsed.project_type || parsed.type || "unknown";
      const status = parsed.status || "unknown";
      const ref = parsed.referenceNumber || parsed.reference_no || parsed.reference_number || basename(file, ".json");
      typeCoverage[projectType] = (typeCoverage[projectType] || 0) + 1;
      statusCoverage[status] = (statusCoverage[status] || 0) + 1;
      if (references.has(ref)) duplicateReferences[ref] = [references.get(ref), relative(legacyRoot, file)];
      else references.set(ref, relative(legacyRoot, file));
    } catch (error) {
      malformed.push({ file: relative(legacyRoot, file), message: error instanceof Error ? error.message : String(error) });
    }
  }

  return { fileCount: files.length, malformed, keyCoverage, typeCoverage, statusCoverage, duplicateReferences };
};

const modules = [
  "app.py",
  "pdf_gen.py",
  "xlsx_gen.py",
  "data_management.py",
  "cover_merger.py",
  "tnc.py",
  "app_helpers.py",
  "static/offer.js",
  "static/challan.js",
  "static/purchase-order.js",
  "static/ai-helper.js",
  "static/chat.js",
  "static/main.js",
  "static/messaging.js",
  "static/activity_log.js",
  "static/search_result.js",
].map((modulePath) => {
  const full = join(legacyRoot, modulePath);
  return {
    path: modulePath,
    exists: existsSync(full),
    sizeBytes: existsSync(full) ? statSync(full).size : 0,
  };
});

const csvFiles = {
  users: "authorization/users.csv",
  clientsDataStorage: "data_storage/clients.csv",
  clientsRoot: "clients.csv",
  activityLog: "data_storage/activity_log.csv",
  reviewRequests: "data_storage/review_requests.csv",
  notifications: "data_storage/notifications.csv",
  projectShares: "data_storage/project_shares.csv",
  tasks: "data_storage/tasks.csv",
  chatHistory: "data_storage/chat_history.csv",
};

const csvReports = Object.fromEntries(
  Object.entries(csvFiles).map(([key, path]) => [key, parseCsvTolerant(join(legacyRoot, path))]),
);

const { routes, socketEvents } = parseRoutes();
const projectReport = parseProjects();

const report = {
  generatedAt: new Date().toISOString(),
  legacyRoot: legacyRoot,
  legacyRootName: basename(legacyRoot),
  modules,
  routes,
  socketEvents,
  csvReports,
  projects: projectReport,
  fileCounts: {
    generatedFosFiles: countFiles(join(legacyRoot, "data_storage", "FOS")),
    coverFiles: countFiles(join(legacyRoot, "assets", "covers"), (file) => !relative(join(legacyRoot, "assets", "covers"), file).startsWith(`thumbnails`)),
    coverThumbnails: countFiles(join(legacyRoot, "assets", "covers", "thumbnails")),
    chatAttachments: countFiles(join(legacyRoot, "data_storage", "chat_attachments")),
    signatureFiles: countFiles(join(legacyRoot, "authorization"), (file) => basename(file).startsWith("Signature_")),
  },
  securityFindings: [
    csvReports.users.header.includes("password")
      ? "users.csv has a password column. Import must hash passwords or force resets; never keep plaintext."
      : null,
    routes.some((route) => route.decorator.includes("role") || readText(join(legacyRoot, "app.py")).includes("request.args.get('role'"))
      ? "Legacy app appears to read role/email from request data. New routes must derive user/role from server session only."
      : "Manually review role/email trust boundaries in app.py.",
    "Legacy file downloads/uploads must be migrated to storage keys with permission checks.",
    "Legacy rich descriptions must be sanitized before rendering in React and generated documents.",
  ].filter(Boolean),
};

mkdirSync(dirname(outputArg), { recursive: true });
writeFileSync(outputArg, JSON.stringify(report, null, 2));
console.log(`Legacy audit written to ${outputArg}`);
console.log(JSON.stringify({
  routes: routes.length,
  socketEvents: socketEvents.length,
  projects: projectReport.fileCount,
  malformedProjects: projectReport.malformed.length,
  users: csvReports.users.rowCount,
  notifications: csvReports.notifications.rowCount,
  chatMessages: csvReports.chatHistory.rowCount,
}, null, 2));
