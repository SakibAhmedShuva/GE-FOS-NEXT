# Stage 18 — Clean Delivery and Readiness Gates

This stage addresses the packaging issue from the GE-FOS-NEXT(3) review.

## Fixed now

### Clean delivery packaging

Added:

- `scripts/package-clean-delivery.mjs`
- `scripts/verify-delivery-zip.mjs`
- package scripts:
  - `pnpm package:clean`
  - `pnpm package:verify <zip>`

The clean packager excludes:

- `.git/`
- `node_modules/`
- `.next/`
- `.env`
- local environment files such as `.env.local`, `.env.production`, `.env.development`, `.env.test`
- `storage/`
- old `data_storage/`
- old `authorization/`
- old `assets/`
- generated `.zip` files
- Python cache files

It keeps:

- `.env.example`
- `package.json`
- `pnpm-lock.yaml`
- `prisma/schema.prisma`
- `prisma/migrations/`
- `app/`
- `components/`
- `lib/`
- `scripts/`
- `docs/`
- `public/`

### Delivery ZIP verification

`pnpm package:verify <zip>` checks a generated delivery ZIP and fails if forbidden folders/files are present.

### Readiness gate script

Added:

- `scripts/production-readiness-check.mjs`
- package scripts:
  - `pnpm readiness:check`
  - `pnpm readiness:build`

`pnpm readiness:check` verifies required source structure and local forbidden root folders.

`pnpm readiness:build` runs the real gate sequence:

```bash
pnpm install --frozen-lockfile
pnpm prisma generate
pnpm build
```

Run `pnpm readiness:build` on the actual VPS/dev machine before approving production readiness.

## Validation run here

The clean packaging command was tested in this sandbox:

```bash
node scripts/package-clean-delivery.mjs /mnt/data/ge_fos_next_clean_delivery_test.zip
node scripts/verify-delivery-zip.mjs /mnt/data/ge_fos_next_clean_delivery_test.zip
node scripts/production-readiness-check.mjs
```

Result:

- delivery ZIP had 0 forbidden entries
- `.env.example` stayed included
- `.git`, `node_modules`, `.next`, `storage`, `data_storage`, `authorization`, and old `assets` were not included
- readiness structure check passed

## Still not final production approval

This does not replace the real build and document parity requirements. Production approval still requires:

```bash
pnpm install --frozen-lockfile
pnpm prisma generate
pnpm build
```

plus golden document comparison, final migration verification, and visual PDF/XLSX parity approval.
