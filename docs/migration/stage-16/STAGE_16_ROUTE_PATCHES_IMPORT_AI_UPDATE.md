# Stage 16 — Missing Route Patches, Safer Downloads, AI Update, Catalog Import

This stage corrects the Stage 15 packaging concern by explicitly including the two download route files again and tightening their behavior.

## Fixed

### Download routes explicitly included

Included again in this update ZIP:

- `app/api/exports/[exportId]/download/route.ts`
- `app/api/chat/attachments/[attachmentId]/route.ts`

Both routes now use:

- `resolveStoragePath()`
- `InvalidStoragePathError`
- 403 for invalid/path-escape storage keys
- 404 for missing files
- no raw filesystem path exposure
- filename header sanitization

### Storage helper hardened

`lib/storage/local-storage.ts` now rejects empty keys, null-byte keys, absolute path escapes, and `../` escapes through final resolved-path checking.

### AI Helper save/update

Saved AI-helper projects can now reopen and update the existing project instead of always creating a new one. The save payload may include `projectId`; the server verifies edit permission before updating.

### Admin catalog import

The admin catalog upload route now performs a real workbook import instead of only staging the uploaded file:

- parses `.xlsx` sheets
- detects description/price/item/code/make/model/approval/unit/install columns
- imports catalog rows
- stores row-level import errors in `price_list_import_errors`
- creates a `price_list_imports` report row
- computes `searchText`
- records admin activity

This is still synchronous. A background worker can be added later for very large workbooks, but the route is now real import logic instead of upload-only staging.

## Checks run

```bash
npx --yes pnpm@10.15.1 install --frozen-lockfile
npx --yes pnpm@10.15.1 prisma generate
npx --yes tsc --noEmit --pretty false
```

Results:

- `pnpm install --frozen-lockfile` passed.
- `prisma generate` is still blocked in this sandbox by `binaries.prisma.sh` DNS.
- Since Prisma Client could not be generated in this sandbox, a temporary local TypeScript declaration stub was used only for checking the changed code, then deleted before packaging. The normal project still requires real `pnpm prisma generate` on VPS/dev before final build approval.

Required real proof remains:

```bash
pnpm install --frozen-lockfile
pnpm prisma generate
pnpm build
```
