#!/usr/bin/env node
import { createHash, randomBytes } from "node:crypto";
import { existsSync, statSync, writeFileSync } from "node:fs";
import { basename, extname, join } from "node:path";
import {
  cleanString,
  createImportSummary,
  ensureDir,
  htmlToPlain,
  mapProjectType,
  mapSourceType,
  mapStatus,
  normalizeEmail,
  parseCsvTolerant,
  parseJsonFile,
  parseLegacyDate,
  relativeKey,
  sanitizeMinimalHtml,
  toDecimalString,
  toInt,
  walkFiles,
} from "./common.mjs";

const args = process.argv.slice(2);
const legacyRoot = args[0];
const writeMode = args.includes("--write");
const outputIndex = args.indexOf("--out");
const outPath = outputIndex >= 0 ? args[outputIndex + 1] : "docs/migration/stage-2/import-dry-run.json";

if (!legacyRoot) {
  console.error("Usage: node scripts/migrate-current-system/import-legacy-system.mjs <legacy-root> [--write] [--out docs/migration/stage-2/import-dry-run.json]");
  process.exit(1);
}

if (!existsSync(legacyRoot)) {
  console.error(`Legacy root does not exist: ${legacyRoot}`);
  process.exit(1);
}

const legacyPasswordMode = process.env.FOS_IMPORT_HASH_LEGACY_PASSWORDS === "true" ? "hash-legacy" : "force-reset";
const summary = createImportSummary();
const errors = [];
const warnings = [];

function addError(source, message, rawData = undefined) {
  summary.migrationErrors += 1;
  errors.push({ source, severity: "ERROR", message, rawData });
}

function addWarning(source, message, rawData = undefined) {
  warnings.push({ source, severity: "WARNING", message, rawData });
}

function stableId(prefix, value) {
  const digest = createHash("sha1").update(String(value)).digest("hex").slice(0, 24);
  return `${prefix}_${digest}`;
}

async function getPasswordHash(legacyPassword) {
  const bcrypt = await import("bcryptjs");
  if (legacyPasswordMode === "hash-legacy" && legacyPassword) {
    return bcrypt.hash(String(legacyPassword), 12);
  }
  return bcrypt.hash(`reset-required:${randomBytes(24).toString("hex")}`, 12);
}

async function loadPrisma() {
  if (!writeMode) return null;
  const { PrismaClient } = await import("@prisma/client");
  return new PrismaClient();
}

function loadUsers() {
  const usersCsv = parseCsvTolerant(join(legacyRoot, "authorization", "users.csv"));
  usersCsv.malformedRows.forEach((row) => addError("authorization/users.csv", "Malformed users.csv row", row));

  const users = usersCsv.records
    .map((row) => {
      const email = normalizeEmail(row.email);
      if (!email) {
        addError("authorization/users.csv", "User row missing email", row);
        return null;
      }
      return {
        id: stableId("usr", email),
        legacySerial: cleanString(row.sl),
        name: cleanString(row.name) || email,
        email,
        legacyPassword: row.password ?? "",
        role: String(row.role ?? "user").toLowerCase() === "admin" ? "ADMIN" : "USER",
        isActive: true,
        passwordResetRequired: legacyPasswordMode !== "hash-legacy",
      };
    })
    .filter(Boolean);

  if (!users.some((user) => user.email === "legacy-orphan@local.invalid")) {
    users.push({
      id: "usr_legacy_orphan",
      legacySerial: null,
      name: "Legacy Orphan Owner",
      email: "legacy-orphan@local.invalid",
      legacyPassword: randomBytes(24).toString("hex"),
      role: "ADMIN",
      isActive: false,
      passwordResetRequired: true,
    });
  }

  summary.users = users.length;
  return users;
}

function loadClients() {
  const sources = [
    ["clients.csv", parseCsvTolerant(join(legacyRoot, "clients.csv"))],
    ["data_storage/clients.csv", parseCsvTolerant(join(legacyRoot, "data_storage", "clients.csv"))],
  ];
  const seen = new Set();
  const clients = [];

  for (const [source, parsed] of sources) {
    parsed.malformedRows.forEach((row) => addError(source, "Malformed client CSV row", row));
    parsed.records.forEach((row) => {
      const clientName = cleanString(row.client_name);
      const clientAddress = cleanString(row.client_address);
      if (!clientName) return;
      const key = `${clientName.toLowerCase()}::${(clientAddress || "").toLowerCase()}`;
      if (seen.has(key)) return;
      seen.add(key);
      clients.push({
        id: stableId("cli", key),
        legacySerial: cleanString(row.sl),
        clientName,
        clientAddress,
        searchText: `${clientName} ${clientAddress || ""}`.toLowerCase(),
      });
    });
  }

  summary.clients = clients.length;
  return clients;
}

function loadProjects(usersByEmail) {
  const projectDir = join(legacyRoot, "data_storage", "projects");
  const projectFiles = walkFiles(projectDir).filter((file) => extname(file).toLowerCase() === ".json");
  const projects = [];
  const projectItems = [];
  const offerSettings = [];

  for (const file of projectFiles) {
    const parsed = parseJsonFile(file);
    const source = relativeKey(legacyRoot, file);
    if (!parsed.ok) {
      addError(source, "Malformed project JSON", parsed.error);
      continue;
    }
    const data = parsed.data;
    const projectId = cleanString(data.projectId) || stableId("prj", source);
    const ownerEmail = normalizeEmail(data.owner_email || data.owner || data.email) || "legacy-orphan@local.invalid";
    const owner = usersByEmail.get(ownerEmail) || usersByEmail.get("legacy-orphan@local.invalid");
    if (!usersByEmail.has(ownerEmail)) {
      addWarning(source, `Owner email not found in users.csv; assigned to legacy orphan: ${ownerEmail}`);
    }
    const projectType = mapProjectType(data.projectType || data.project_type || data.type);

    projects.push({
      id: projectId,
      legacyProjectId: projectId,
      referenceNumber: String(data.referenceNumber ?? data.reference_number ?? data.reference_no ?? projectId),
      projectType,
      status: mapStatus(data.status),
      ownerUserId: owner.id,
      clientSnapshot: data.client ?? null,
      legacyJson: data,
      metadata: {
        sourceFile: source,
        categories: data.categories ?? null,
        matchSources: data.matchSources ?? null,
        namingCategories: data.namingCategories ?? null,
        descriptionColumnIndex: data.descriptionColumnIndex ?? null,
        quantityColumnIndex: data.quantityColumnIndex ?? null,
        unitColumnIndex: data.unitColumnIndex ?? null,
        unitPriceColumnIndex: data.unitPriceColumnIndex ?? null,
        selections: data.selections ?? null,
      },
      lastModifiedAt: parseLegacyDate(data.lastModified),
    });

    const items = Array.isArray(data.items) ? data.items : [];
    items.forEach((item, index) => {
      const description = item.description ?? item.description_html ?? item.search_text ?? "";
      const descriptionHtml = sanitizeMinimalHtml(description);
      projectItems.push({
        id: stableId("pit", `${projectId}:${index}:${JSON.stringify(item).slice(0, 500)}`),
        projectId,
        sortOrder: index,
        sourceType: mapSourceType(item.source_type, item),
        catalogItemId: null,
        itemCode: cleanString(item.item_code),
        productType: cleanString(item.product_type),
        make: cleanString(item.make),
        model: cleanString(item.model),
        approvals: cleanString(item.approvals),
        descriptionHtml,
        descriptionPlain: htmlToPlain(description),
        qty: toDecimalString(item.qty ?? item.quantity),
        unit: cleanString(item.unit),
        foreignPriceUsd: toDecimalString(item.foreign_price_usd ?? item.offer_price),
        foreignTotalUsd: toDecimalString(item.foreign_total_usd),
        localSupplyPriceBdt: toDecimalString(item.local_supply_price_bdt),
        localSupplyTotalBdt: toDecimalString(item.local_supply_total_bdt),
        installationPriceBdt: toDecimalString(item.installation_price_bdt ?? item.installation),
        installationTotalBdt: toDecimalString(item.installation_total_bdt),
        poPriceUsd: toDecimalString(item.po_price_usd ?? item.po_price),
        poTotalUsd: toDecimalString(item.po_total_usd),
        poPriceBdt: toDecimalString(item.po_price_bdt),
        isCustom: Boolean(item.isCustom),
        metadata: item,
      });
    });

    if (
      data.financials ||
      data.financialLabels ||
      data.visibleColumns ||
      data.selected_cover ||
      data.isSummaryPageEnabled !== undefined ||
      data.summaryScopeDescriptions ||
      data.tncState ||
      data.includeSignature !== undefined
    ) {
      offerSettings.push({
        projectId,
        financials: data.financials ?? null,
        financialLabels: data.financialLabels ?? null,
        visibleColumns: data.visibleColumns ?? null,
        selectedCoverFilename: cleanString(data.selected_cover),
        isSummaryPageEnabled: Boolean(data.isSummaryPageEnabled),
        summaryScopeDescriptions: data.summaryScopeDescriptions ?? null,
        tncState: data.tncState ?? null,
        includeSignature: Boolean(data.includeSignature),
      });
    }
  }

  summary.projects = projects.length;
  summary.projectItems = projectItems.length;
  summary.offerSettings = offerSettings.length;
  return { projects, projectItems, offerSettings };
}

function loadCovers(usersByEmail) {
  const coversDir = join(legacyRoot, "assets", "covers");
  const files = walkFiles(coversDir).filter((file) => {
    const key = relativeKey(coversDir, file);
    return !key.startsWith("thumbnails/") && [".pdf", ".docx"].includes(extname(file).toLowerCase());
  });

  const covers = files.map((file) => ({
    id: stableId("cov", relativeKey(legacyRoot, file)),
    filename: basename(file),
    storageKey: `covers/${basename(file)}`,
    thumbnailStorageKey: existsSync(join(coversDir, "thumbnails", `${basename(file, extname(file))}.png`))
      ? `cover-thumbnails/${basename(file, extname(file))}.png`
      : null,
    uploadedByUserId: usersByEmail.get("legacy-orphan@local.invalid")?.id ?? null,
    projectReference: basename(file, extname(file)),
    sourceFile: relativeKey(legacyRoot, file),
  }));
  summary.covers = covers.length;
  return covers;
}

function loadShares(usersByEmail, projectIds) {
  const parsed = parseCsvTolerant(join(legacyRoot, "data_storage", "project_shares.csv"));
  parsed.malformedRows.forEach((row) => addError("data_storage/project_shares.csv", "Malformed project share row", row));
  const shares = [];
  parsed.records.forEach((row) => {
    const projectId = cleanString(row.project_id);
    const ownerEmail = normalizeEmail(row.owner_email);
    const sharedEmail = normalizeEmail(row.shared_with_email);
    if (!projectId || !projectIds.has(projectId) || !sharedEmail) {
      addError("data_storage/project_shares.csv", "Share row references missing project or user", row);
      return;
    }
    const owner = usersByEmail.get(ownerEmail) || usersByEmail.get("legacy-orphan@local.invalid");
    const sharedWith = usersByEmail.get(sharedEmail);
    if (!sharedWith) {
      addError("data_storage/project_shares.csv", `Shared-with user not found: ${sharedEmail}`, row);
      return;
    }
    shares.push({
      id: cleanString(row.share_id) || stableId("shr", JSON.stringify(row)),
      projectId,
      ownerUserId: owner.id,
      sharedWithUserId: sharedWith.id,
      permission: String(row.permissions ?? row.permission ?? "view").toLowerCase().includes("edit") ? "EDIT" : "VIEW",
      createdAt: parseLegacyDate(row.timestamp) ?? new Date(),
    });
  });
  summary.shares = shares.length;
  return shares;
}

function loadNotifications(usersByEmail) {
  const parsed = parseCsvTolerant(join(legacyRoot, "data_storage", "notifications.csv"));
  parsed.malformedRows.forEach((row) => addError("data_storage/notifications.csv", "Malformed notification row", row));
  const notifications = [];
  parsed.records.forEach((row) => {
    const email = normalizeEmail(row.user_email);
    const user = usersByEmail.get(email);
    if (!user) {
      addError("data_storage/notifications.csv", `Notification user not found: ${email}`, row);
      return;
    }
    notifications.push({
      id: cleanString(row.notification_id) || stableId("not", JSON.stringify(row)),
      legacyId: cleanString(row.notification_id),
      userId: user.id,
      type: "SYSTEM",
      title: null,
      messageHtml: sanitizeMinimalHtml(row.message) || "",
      isRead: String(row.is_read ?? "").toLowerCase() === "true" || String(row.is_read ?? "") === "1",
      metadata: row,
      createdAt: parseLegacyDate(row.timestamp) ?? new Date(),
      readAt: String(row.is_read ?? "").toLowerCase() === "true" ? parseLegacyDate(row.timestamp) : null,
    });
  });
  summary.notifications = notifications.length;
  return notifications;
}

function loadReviewRequests(usersByEmail, projectIds) {
  const parsed = parseCsvTolerant(join(legacyRoot, "data_storage", "review_requests.csv"));
  parsed.malformedRows.forEach((row) => addError("data_storage/review_requests.csv", "Malformed review request row", row));
  const requests = [];
  parsed.records.forEach((row) => {
    const email = normalizeEmail(row.user_email);
    const user = usersByEmail.get(email);
    if (!user) {
      addError("data_storage/review_requests.csv", `Review requester not found: ${email}`, row);
      return;
    }
    let details = row.details || null;
    try {
      details = details ? JSON.parse(details) : null;
    } catch {
      details = { legacyDetailsText: row.details };
    }
    requests.push({
      id: cleanString(row.request_id) || stableId("rev", JSON.stringify(row)),
      legacyRequestId: cleanString(row.request_id),
      userId: user.id,
      projectId: projectIds.has(row.project_id) ? row.project_id : null,
      requestType: cleanString(row.request_type) || "legacy",
      itemCode: cleanString(row.item_code),
      details,
      status: String(row.status ?? "draft").toLowerCase() === "approved" ? "APPROVED" : String(row.status ?? "").toLowerCase() === "rejected" ? "REJECTED" : "PENDING",
      visibility: String(row.visibility ?? "user").toLowerCase() === "admin" ? "ADMIN" : "USER",
      remarks: cleanString(row.remarks),
      createdAt: parseLegacyDate(row.timestamp) ?? new Date(),
    });
  });
  summary.reviewRequests = requests.length;
  return requests;
}

function loadChatMessages(usersByEmail) {
  const parsed = parseCsvTolerant(join(legacyRoot, "data_storage", "chat_history.csv"));
  parsed.malformedRows.forEach((row) => addError("data_storage/chat_history.csv", "Malformed chat history row", row));
  const messages = [];
  parsed.records.forEach((row) => {
    const senderEmail = normalizeEmail(row.sender_email);
    const recipientEmail = normalizeEmail(row.recipient_email);
    const sender = usersByEmail.get(senderEmail);
    const recipient = usersByEmail.get(recipientEmail);
    if (!sender || !recipient) {
      addError("data_storage/chat_history.csv", "Chat message sender or recipient not found", row);
      return;
    }
    let message = row.message;
    try {
      message = JSON.parse(row.message);
    } catch {
      message = { text: row.message };
    }
    messages.push({
      id: cleanString(row.message_id) || stableId("msg", JSON.stringify(row)),
      legacyMessageId: cleanString(row.message_id),
      senderUserId: sender.id,
      recipientUserId: recipient.id,
      message,
      createdAt: parseLegacyDate(row.timestamp) ?? new Date(),
    });
  });
  summary.chatMessages = messages.length;
  return messages;
}

function loadActivityRows(usersByEmail, projectIds) {
  const parsed = parseCsvTolerant(join(legacyRoot, "data_storage", "activity_log.csv"), { coalesceExtraColumns: true });
  parsed.malformedRows.forEach((row) => addError("data_storage/activity_log.csv", "Malformed activity log row", row));
  const rows = parsed.records.map((row, index) => {
    const actorName = cleanString(row.user_name);
    const ref = cleanString(row.fo_name);
    const projectId = ref ? [...projectIds].find((id) => id === ref) ?? null : null;
    return {
      id: stableId("act", `${index}:${JSON.stringify(row)}`),
      actorUserId: null,
      actorNameSnapshot: actorName,
      action: "legacy_activity",
      entityType: "legacy_file",
      entityId: ref,
      projectId,
      referenceNumber: ref,
      filePathOrStorageKey: cleanString(row.file_path),
      metadata: row,
      legacyRow: row,
      createdAt: parseLegacyDate(row.date) ?? new Date(),
    };
  });
  summary.activityRows = rows.length;
  return rows;
}

function loadGeneratedExports(projectsByReference) {
  const files = walkFiles(join(legacyRoot, "data_storage", "FOS")).filter((file) => [".pdf", ".xlsx"].includes(extname(file).toLowerCase()));
  const exports = [];
  const unmatched = [];

  files.forEach((file) => {
    const filename = basename(file);
    const stem = basename(file, extname(file));
    const normalizedStem = stem.replace(/V\d+$/i, "");
    const project = projectsByReference.get(stem) || projectsByReference.get(normalizedStem);
    if (!project) {
      unmatched.push(relativeKey(legacyRoot, file));
      return;
    }
    exports.push({
      id: stableId("exp", relativeKey(legacyRoot, file)),
      projectId: project.id,
      exportType: extname(file).toLowerCase() === ".pdf" ? "PDF" : "XLSX",
      documentType: project.projectType === "CHALLAN" ? "CHALLAN" : project.projectType === "PURCHASE_ORDER" ? "PURCHASE_ORDER" : "OFFER",
      filename,
      storageKey: `exports/${filename}`,
      generatedByUserId: project.ownerUserId,
      metadata: { sourceFile: relativeKey(legacyRoot, file), sizeBytes: statSync(file).size },
    });
  });

  summary.generatedExportsMatched = exports.length;
  summary.generatedExportsUnmatched = unmatched.length;
  unmatched.forEach((file) => addWarning(file, "Generated FOS file could not be matched to a project reference"));
  return exports;
}

async function writeToDatabase(bundle) {
  const prisma = await loadPrisma();
  if (!prisma) return;

  try {
    for (const user of bundle.users) {
      const passwordHash = await getPasswordHash(user.legacyPassword);
      await prisma.user.upsert({
        where: { email: user.email },
        update: {
          name: user.name,
          role: user.role,
          isActive: user.isActive,
          passwordResetRequired: user.passwordResetRequired,
          legacyPasswordImportedAt: legacyPasswordMode === "hash-legacy" ? new Date() : null,
        },
        create: {
          id: user.id,
          legacySerial: user.legacySerial,
          name: user.name,
          email: user.email,
          passwordHash,
          role: user.role,
          isActive: user.isActive,
          passwordResetRequired: user.passwordResetRequired,
          legacyPasswordImportedAt: legacyPasswordMode === "hash-legacy" ? new Date() : null,
        },
      });
    }

    for (const client of bundle.clients) {
      await prisma.client.upsert({ where: { id: client.id }, update: client, create: client });
    }

    for (const cover of bundle.covers) {
      await prisma.cover.upsert({
        where: { storageKey: cover.storageKey },
        update: {
          filename: cover.filename,
          thumbnailStorageKey: cover.thumbnailStorageKey,
          uploadedByUserId: cover.uploadedByUserId,
          projectReference: cover.projectReference,
        },
        create: {
          id: cover.id,
          filename: cover.filename,
          storageKey: cover.storageKey,
          thumbnailStorageKey: cover.thumbnailStorageKey,
          uploadedByUserId: cover.uploadedByUserId,
          projectReference: cover.projectReference,
        },
      });
    }

    for (const project of bundle.projects) {
      await prisma.project.upsert({ where: { id: project.id }, update: project, create: project });
    }

    for (const item of bundle.projectItems) {
      await prisma.projectItem.upsert({ where: { id: item.id }, update: item, create: item });
    }

    const coversByFilename = new Map(bundle.covers.map((cover) => [cover.filename, cover.id]));
    for (const setting of bundle.offerSettings) {
      const selectedCoverId = setting.selectedCoverFilename ? coversByFilename.get(setting.selectedCoverFilename) ?? null : null;
      await prisma.offerSetting.upsert({
        where: { projectId: setting.projectId },
        update: { ...setting, selectedCoverFilename: undefined, selectedCoverId },
        create: { ...setting, selectedCoverFilename: undefined, selectedCoverId },
      });
    }

    for (const share of bundle.shares) {
      await prisma.projectShare.upsert({ where: { id: share.id }, update: share, create: share });
    }

    for (const notification of bundle.notifications) {
      await prisma.notification.upsert({ where: { id: notification.id }, update: notification, create: notification });
    }

    for (const review of bundle.reviewRequests) {
      await prisma.reviewRequest.upsert({ where: { id: review.id }, update: review, create: review });
    }

    for (const message of bundle.chatMessages) {
      await prisma.chatMessage.upsert({ where: { id: message.id }, update: message, create: message });
    }

    for (const activity of bundle.activityRows) {
      await prisma.activityLog.upsert({ where: { id: activity.id }, update: activity, create: activity });
    }

    for (const exp of bundle.generatedExports) {
      await prisma.export.upsert({ where: { id: exp.id }, update: exp, create: exp });
    }
  } finally {
    await prisma.$disconnect();
  }
}

const users = loadUsers();
const usersByEmail = new Map(users.map((user) => [user.email, user]));
const clients = loadClients();
const { projects, projectItems, offerSettings } = loadProjects(usersByEmail);
const projectIds = new Set(projects.map((project) => project.id));
const projectsByReference = new Map(projects.map((project) => [project.referenceNumber, project]));
const covers = loadCovers(usersByEmail);
const shares = loadShares(usersByEmail, projectIds);
const notifications = loadNotifications(usersByEmail);
const reviewRequests = loadReviewRequests(usersByEmail, projectIds);
const chatMessages = loadChatMessages(usersByEmail);
const activityRows = loadActivityRows(usersByEmail, projectIds);
const generatedExports = loadGeneratedExports(projectsByReference);

const bundle = {
  generatedAt: new Date().toISOString(),
  sourceRoot: legacyRoot,
  writeMode,
  legacyPasswordMode,
  summary,
  warnings,
  errors,
  users: users.map(({ legacyPassword, ...safeUser }) => safeUser),
  clients,
  projects,
  projectItems,
  offerSettings,
  covers,
  shares,
  notifications,
  reviewRequests,
  chatMessages,
  activityRows,
  generatedExports,
};

if (writeMode) {
  await writeToDatabase({ users, clients, projects, projectItems, offerSettings, covers, shares, notifications, reviewRequests, chatMessages, activityRows, generatedExports });
}

ensureDir(outPath.split("/").slice(0, -1).join("/") || ".");
writeFileSync(outPath, JSON.stringify(bundle, null, 2));

console.log(JSON.stringify({ writeMode, legacyPasswordMode, summary, warnings: warnings.length, errors: errors.length, outPath }, null, 2));
