#!/usr/bin/env node
import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";

const zipPath = process.argv[2];
if (!zipPath) {
  console.error("Usage: node scripts/verify-delivery-zip.mjs <delivery.zip>");
  process.exit(1);
}
if (!existsSync(zipPath)) {
  console.error(`ZIP not found: ${zipPath}`);
  process.exit(1);
}

const result = spawnSync("unzip", ["-Z1", zipPath], { encoding: "utf8" });
if (result.error) {
  console.error(`Unable to run unzip: ${result.error.message}`);
  process.exit(1);
}
if (result.status !== 0) {
  console.error(result.stderr || result.stdout);
  process.exit(result.status || 1);
}

const entries = result.stdout.split(/\r?\n/).filter(Boolean);
const forbidden = entries.filter((entry) => {
  const normalized = entry.replace(/\\/g, "/");
  if (normalized === ".env.example" || normalized.endsWith("/.env.example")) return false;
  return (
    normalized === ".git/" || normalized.startsWith(".git/") || normalized.includes("/.git/") ||
    normalized === "node_modules/" || normalized.startsWith("node_modules/") || normalized.includes("/node_modules/") ||
    normalized === ".next/" || normalized.startsWith(".next/") || normalized.includes("/.next/") ||
    normalized === "storage/" || normalized.startsWith("storage/") || normalized.includes("/storage/") ||
    normalized === "data_storage/" || normalized.startsWith("data_storage/") || normalized.includes("/data_storage/") ||
    normalized === "authorization/" || normalized.startsWith("authorization/") || normalized.includes("/authorization/") ||
    normalized === "assets/" || normalized.startsWith("assets/") || normalized.includes("/assets/") ||
    /(^|\/)\.env($|\.)/.test(normalized)
  );
});

if (forbidden.length) {
  console.error("Forbidden delivery entries found:");
  forbidden.slice(0, 100).forEach((entry) => console.error(`- ${entry}`));
  if (forbidden.length > 100) console.error(`...and ${forbidden.length - 100} more`);
  process.exit(1);
}

const required = ["package.json", "pnpm-lock.yaml", "prisma/schema.prisma"];
const missing = required.filter((entry) => !entries.includes(entry));
if (missing.length) {
  console.error("Required entries missing:");
  missing.forEach((entry) => console.error(`- ${entry}`));
  process.exit(1);
}

console.log(JSON.stringify({ zipPath, entries: entries.length, forbiddenEntries: 0, missingRequired: 0 }, null, 2));
