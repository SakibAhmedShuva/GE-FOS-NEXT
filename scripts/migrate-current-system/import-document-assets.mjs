#!/usr/bin/env node
import { copyFileSync, existsSync, mkdirSync, readdirSync, writeFileSync } from "node:fs";
import { basename, join, resolve } from "node:path";

function usage() {
  console.error("Usage: pnpm migration:document-assets /path/to/old/stable/folder [--out docs/migration/document-assets-manifest.json]");
  process.exit(1);
}

const args = process.argv.slice(2);
const sourceRootArg = args.find((arg) => !arg.startsWith("--"));
if (!sourceRootArg) usage();
const outFlagIndex = args.indexOf("--out");
const outPath = outFlagIndex >= 0 ? args[outFlagIndex + 1] : "docs/migration/document-assets-manifest.json";

const sourceRoot = resolve(sourceRootArg);
const storageRoot = resolve(process.env.FOS_STORAGE_ROOT || "storage");
const copied = [];
const missing = [];

function ensureParent(storageKey) {
  mkdirSync(join(storageRoot, storageKey, ".."), { recursive: true });
}

function copyIfExists(relativeSource, storageKey) {
  const sourcePath = join(sourceRoot, relativeSource);
  if (!existsSync(sourcePath)) {
    missing.push({ source: relativeSource, storageKey });
    return;
  }
  ensureParent(storageKey);
  const targetPath = join(storageRoot, storageKey);
  copyFileSync(sourcePath, targetPath);
  copied.push({ source: relativeSource, storageKey });
}

copyIfExists("assets/letterhead.pdf", "assets/letterhead.pdf");
copyIfExists("assets/amoge_logo.png", "assets/amoge_logo.png");
copyIfExists("assets/NAFFCO_Logo_New.png", "assets/NAFFCO_Logo_New.png");

const authorizationDir = join(sourceRoot, "authorization");
if (existsSync(authorizationDir)) {
  for (const filename of readdirSync(authorizationDir)) {
    if (/^Signature_.*\.(png|jpe?g)$/i.test(filename)) {
      copyIfExists(`authorization/${filename}`, `assets/signatures/${basename(filename)}`);
    }
  }
} else {
  missing.push({ source: "authorization/Signature_*.png|jpg", storageKey: "assets/signatures/" });
}

const manifest = {
  sourceRoot,
  storageRoot,
  copied,
  missing,
  recommendedEnv: {
    FOS_LETTERHEAD_STORAGE_KEY: copied.some((item) => item.storageKey === "assets/letterhead.pdf") ? "assets/letterhead.pdf" : "",
    FOS_PDF_ASSET_MODE: "letterhead-only",
    FOS_LOGO_STORAGE_KEY: copied.some((item) => item.storageKey === "assets/amoge_logo.png") ? "assets/amoge_logo.png" : "",
    FOS_SIGNATURE_STORAGE_KEY: copied.find((item) => item.storageKey.startsWith("assets/signatures/"))?.storageKey || "",
  },
  notes: [
    "Default FOS_PDF_ASSET_MODE is letterhead-only to avoid duplicate logos when the letterhead already contains branding.",
    "Set FOS_PDF_ASSET_MODE=both only after visually confirming the letterhead does not already include the same logo.",
    "Set FOS_PO_INCLUDE_SIGNATURE=true only if purchase orders require signature stamping.",
  ],
};

mkdirSync(join(resolve(outPath), ".."), { recursive: true });
writeFileSync(outPath, JSON.stringify(manifest, null, 2));
console.log(JSON.stringify(manifest, null, 2));
