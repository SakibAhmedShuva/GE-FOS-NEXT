# Stage 15 — Packaging, Build Guard, Download Hardening, AI Reopen

This stage does not add random new modules. It addresses the critical blockers raised in the revised GE-FOS-NEXT instruction.

## Fixed in this stage

- `package.json` is included again in the update package.
- `pnpm-lock.yaml` was deleted and regenerated with `npx --yes pnpm@10.15.1 install --lockfile-only`.
- The lockfile was checked for sandbox/internal references. No `/mnt/data`, `sandbox`, `file:`, `applied-caas`, or `internal.api.openai` package sources are present, except the normal pnpm setting name `excludeLinksFromLockfile`.
- `app/(app)/admin/activity/page.tsx` now performs page-level admin protection and redirects non-admin users to `/dashboard`.
- Export downloads now resolve storage keys through `resolveStoragePath()` and reject paths outside `FOS_STORAGE_ROOT`.
- Chat attachment downloads now resolve storage keys through `resolveStoragePath()` and reject paths outside `FOS_STORAGE_ROOT`.
- Missing export or attachment files now return 404 JSON responses instead of leaking raw filesystem errors.
- Saved AI-helper projects can reopen from `/ai-helper?projectId=...`.
- A document parity note was added to make clear that current PDFs are foundation exports, not final old-layout business documents.

## Commands run in this sandbox

```bash
npx --yes pnpm@10.15.1 install --lockfile-only
npx --yes pnpm@10.15.1 install --frozen-lockfile
npx --yes tsc --noEmit --pretty false
npx --yes pnpm@10.15.1 prisma generate
npx --yes pnpm@10.15.1 build
```

## Results

- `pnpm install --frozen-lockfile` passed.
- `tsc --noEmit` passed.
- `prisma generate` did not pass in this sandbox because the environment could not resolve `binaries.prisma.sh`.
- `next build` compiled successfully, then could not finish the full production build proof because the build worker was terminated during page-data collection in this sandbox.

## Do not mark build-safe until this passes on VPS/dev machine

```bash
pnpm install --frozen-lockfile
pnpm prisma generate
pnpm build
```

## Remaining priority

Finish real document parity next:

1. Financial Offer PDF/XLSX parity
2. Challan PDF/XLSX parity
3. Purchase Order PDF/XLSX parity
4. cover/signature/logo/letterhead handling
5. golden old-vs-new comparison
6. final migration verification
