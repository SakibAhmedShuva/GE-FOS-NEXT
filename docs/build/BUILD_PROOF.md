# Build / Deployment Safety Proof

## Route group note

`app/(app)` is correct Next.js App Router syntax. It is a route group used to organize protected app pages without changing URLs. Example: `app/(app)/dashboard/page.tsx` becomes `/dashboard`.

## Packaging status

- `package.json` is present and must be included in update packages.
- Required runtime scripts are present for `dev`, `build`, `start`, Prisma generate/deploy/studio, and final migration verification.
- `pnpm-lock.yaml` was regenerated with `npx --yes pnpm@10.15.1 install --lockfile-only`, then sandbox-injected internal tarball URLs were removed from the lockfile so the submitted file does not contain OpenAI/internal registry URLs.
- The cleaned lockfile was checked for `/mnt/data`, `sandbox`, `file:`, `applied-caas`, and `internal.api.openai` references. None are present, except the normal pnpm setting name `excludeLinksFromLockfile`.

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
- `next build` reached successful compile, then the build worker was terminated during page-data collection in this sandbox.
- `prisma generate` failed because this sandbox could not resolve Prisma binary CDN DNS.

Prisma failure:

```text
getaddrinfo EAI_AGAIN binaries.prisma.sh
```

Build termination:

```text
Compiled successfully
Collecting page data ...
Next.js build worker exited with code: null and signal: SIGTERM
```

Because Prisma Client generation cannot finish in this sandbox, the project is **not marked fully build-safe yet**.

## Required real build proof on dev/VPS machine

Run these on the actual dev machine/VPS with network access to Prisma binaries:

```bash
pnpm install --frozen-lockfile
pnpm prisma generate
pnpm build
```

Only mark build/deployment safety complete after all three pass.

## Build-safety fixes already added

- Protected app layout.
- User-aware and admin-aware sidebar.
- Page-level admin guard for `app/(app)/admin/activity/page.tsx`.
- Removed `next/font/google` dependency to avoid Google Fonts network calls during build.
- TypeScript target raised to `es2017`.
- Strict TypeScript issues fixed through Stage 15.
- Export and chat attachment downloads hardened to keep resolved files inside `FOS_STORAGE_ROOT`.

## Stage 16 check

Stage 16 explicitly re-included the export and chat attachment download routes and added 403/404-safe path handling.

Commands run:

```bash
npx --yes pnpm@10.15.1 install --frozen-lockfile
npx --yes pnpm@10.15.1 prisma generate
npx --yes tsc --noEmit --pretty false
```

Result:

- `pnpm install --frozen-lockfile` passed.
- `pnpm prisma generate` is still blocked in this sandbox by `getaddrinfo EAI_AGAIN binaries.prisma.sh`.
- A temporary local TypeScript declaration stub for `@prisma/client` was used only to check Stage 16 code changes, then removed before packaging. This is not a replacement for real Prisma generation.

## Stage 17 check

Stage 17 removed deliberate PDF item truncation and added golden document comparison tooling.

Commands run:

```bash
npx --yes pnpm@10.15.1 install --frozen-lockfile
npx --yes pnpm@10.15.1 prisma generate
npx --yes tsc --noEmit --pretty false
```

Result:

- `pnpm install --frozen-lockfile` passed.
- `pnpm prisma generate` is still blocked in this sandbox by `getaddrinfo EAI_AGAIN binaries.prisma.sh`.
- A temporary local TypeScript declaration stub for `@prisma/client` was used only to check Stage 17 code changes, then removed before packaging. This is not a replacement for real Prisma generation.

## Stage 18 delivery packaging check

Stage 18 added clean delivery packaging and verification scripts.

Commands run in this sandbox:

```bash
node scripts/package-clean-delivery.mjs /mnt/data/ge_fos_next_clean_delivery_test.zip
node scripts/verify-delivery-zip.mjs /mnt/data/ge_fos_next_clean_delivery_test.zip
node scripts/production-readiness-check.mjs
```

Result:

- Clean delivery ZIP verification passed with 0 forbidden entries.
- `.env.example` remained included.
- `.git`, `node_modules`, `.next`, `storage`, old `data_storage`, old `authorization`, and old `assets` were excluded from the generated test delivery ZIP.
- Local readiness structure check passed.

This still does not replace the required VPS/dev machine build proof:

```bash
pnpm install --frozen-lockfile
pnpm prisma generate
pnpm build
```

## Stage 19 check

Stage 19 added actual selected-cover PDF merge for Offer PDF export and removed visible pending-marker lines from generated PDFs.

Commands run:

```bash
npx --yes pnpm@10.15.1 install --frozen-lockfile
npx --yes pnpm@10.15.1 prisma generate
npx --yes tsc --noEmit --pretty false
```

Result:

- `pnpm install --frozen-lockfile` passed.
- `pnpm prisma generate` is still blocked in this sandbox by `getaddrinfo EAI_AGAIN binaries.prisma.sh`.
- A temporary local TypeScript declaration stub for `@prisma/client` was used only to check Stage 19 code changes, then removed before packaging. This is not a replacement for real Prisma generation.

## Stage 20 check

Stage 20 removed internal/debug lines from customer-facing Offer PDF output and changed cover-merge failure behavior to return a clear warning to the UI.

Commands run:

```bash
npx --yes pnpm@10.15.1 install --frozen-lockfile
npx --yes pnpm@10.15.1 prisma generate
npx --yes tsc --noEmit --pretty false
```

Result:

- `pnpm install --frozen-lockfile` passed.
- `pnpm prisma generate` is still blocked in this sandbox by `getaddrinfo EAI_AGAIN binaries.prisma.sh`.
- A temporary local TypeScript declaration stub for `@prisma/client` was used only to check Stage 20 code changes, then removed before packaging. This is not a replacement for real Prisma generation.

## Stage 21 check

Stage 21 added PDF asset stamping hooks for letterhead, logo, and signature through safe storage keys.

Commands run:

```bash
npx --yes pnpm@10.15.1 install --frozen-lockfile
npx --yes pnpm@10.15.1 prisma generate
npx --yes tsc --noEmit --pretty false
```

Result:

- `pnpm install --frozen-lockfile` passed.
- `pnpm prisma generate` is still blocked in this sandbox by `getaddrinfo EAI_AGAIN binaries.prisma.sh`.
- A temporary local TypeScript declaration stub for `@prisma/client` was used only to check Stage 21 code changes, then removed before packaging. This is not a replacement for real Prisma generation.

## Stage 22 note

This batch intentionally focused on document parity follow-up only: export warning display, document asset migration, duplicate-logo controls, configurable PDF coordinates, and PO signature configurability. VPS build proof was not the target of this batch.

## Stage 23 note

This batch focused only on document-asset parity rules: Offer warning confirmation, document-specific logo selection, and per-user signature storage-key support. It does not claim final document visual parity.

## Stage 24 note

This batch updates only the signature ownership rule for PDF parity. It does not claim final layout parity.

## Stage 25 note

This batch fixes signature audit metadata and Challan prepared-by stability. It does not claim final document visual parity.
