#!/usr/bin/env node
import { mkdirSync, rmSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { spawnSync } from "node:child_process";

const outPath = resolve(process.argv[2] || "dist/ge-fos-next-clean-source.zip");
mkdirSync(dirname(outPath), { recursive: true });
rmSync(outPath, { force: true });

const excludePatterns = [
  "*.git/*",
  "*/.git/*",
  "node_modules/*",
  "*/node_modules/*",
  ".next/*",
  "*/.next/*",
  ".env",
  ".env.local",
  ".env.development",
  ".env.production",
  ".env.test",
  ".env*.local",
  "storage/*",
  "*/storage/*",
  "data_storage/*",
  "*/data_storage/*",
  "authorization/*",
  "*/authorization/*",
  "assets/*",
  "*/assets/*",
  "dist/*",
  "*/dist/*",
  "*.zip",
  "*.pyc",
  "__pycache__/*",
  "*/__pycache__/*",
];

const args = ["-r", outPath, ".", "-x", ...excludePatterns];
const result = spawnSync("zip", args, { stdio: "inherit" });
if (result.error) {
  console.error(`Unable to run zip: ${result.error.message}`);
  process.exit(1);
}
if (result.status !== 0) process.exit(result.status || 1);
console.log(`Clean delivery ZIP written to ${outPath}`);
