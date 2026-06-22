#!/usr/bin/env node
import { existsSync, readdirSync } from "node:fs";
import { spawnSync } from "node:child_process";

const runBuild = process.argv.includes("--run-build");
const requiredPaths = ["package.json", "pnpm-lock.yaml", "prisma/schema.prisma", "prisma/migrations", "app", "components", "lib", "scripts", "docs"];
const checks = [];
const missing = requiredPaths.filter((path) => !existsSync(path));
checks.push({ name: "required project files", ok: missing.length === 0, details: missing });

for (const forbidden of ["node_modules", ".next", "storage", "data_storage", "authorization"]) {
  checks.push({ name: `delivery excludes ${forbidden}`, ok: !existsSync(forbidden), details: existsSync(forbidden) ? [`${forbidden} exists locally; package:clean excludes it from delivery`] : [] });
}

if (existsSync("prisma/migrations")) {
  const migrations = readdirSync("prisma/migrations").filter((entry) => !entry.startsWith("."));
  checks.push({ name: "prisma migrations present", ok: migrations.length > 0, details: migrations });
}

if (runBuild) {
  for (const [name, cmd, args] of [
    ["pnpm install --frozen-lockfile", "pnpm", ["install", "--frozen-lockfile"]],
    ["pnpm prisma generate", "pnpm", ["prisma", "generate"]],
    ["pnpm build", "pnpm", ["build"]],
  ]) {
    const result = spawnSync(cmd, args, { stdio: "inherit", shell: process.platform === "win32" });
    checks.push({ name, ok: result.status === 0, details: result.status === 0 ? [] : [`exit ${result.status}`] });
    if (result.status !== 0) break;
  }
}

const ok = checks.every((check) => check.ok);
console.log(JSON.stringify({ ok, checks }, null, 2));
process.exit(ok ? 0 : 1);
