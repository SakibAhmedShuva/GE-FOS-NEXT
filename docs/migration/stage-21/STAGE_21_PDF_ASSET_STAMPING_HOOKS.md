# Stage 21 — PDF Asset Stamping Hooks

This stage continues document-parity work only.

## What changed

### Shared PDF asset post-processing

Added:

- `lib/document-generation/pdf-assets.ts`

It supports optional PDF asset stamping through storage keys:

- `FOS_LETTERHEAD_STORAGE_KEY`
- `FOS_LOGO_STORAGE_KEY`
- `FOS_SIGNATURE_STORAGE_KEY`

Supported behavior:

- letterhead PDF underlay behind generated PDF pages
- PNG/JPG logo placement on every page
- PNG/JPG signature placement on the final page when signature is enabled
- non-fatal asset warnings returned to export API responses and metadata

### Offer PDF export updated

Offer PDF export now applies business assets before selected-cover merge:

1. generate base offer PDF
2. apply letterhead/logo/signature assets when configured
3. prepend selected cover PDF when selected
4. save final PDF
5. return warnings if any asset or cover operation fails

### Challan PDF export updated

Challan PDF export now applies letterhead/logo/signature asset hooks. Signature is applied only when the challan project has `includeSignature` enabled.

### Purchase Order PDF export updated

Purchase Order PDF export now applies letterhead/logo asset hooks and returns warnings.

## Environment setup

Set these to storage keys, not raw filesystem paths:

```bash
FOS_LETTERHEAD_STORAGE_KEY=assets/letterhead.pdf
FOS_LOGO_STORAGE_KEY=assets/logo.png
FOS_SIGNATURE_STORAGE_KEY=assets/signature.png
```

Files are resolved through `resolveStoragePath()`, so they must remain inside `FOS_STORAGE_ROOT`.

## Still left

This is still not full old visual parity. Remaining work:

- exact old table layout
- exact old letterhead/logo/signature coordinates after visual review
- generated cover thumbnails
- final T&C visual layout
- final summary page visual layout
- real old-vs-new golden comparison
- VPS/dev build proof

## Checks run

```bash
npx --yes pnpm@10.15.1 install --frozen-lockfile
npx --yes pnpm@10.15.1 prisma generate
npx --yes tsc --noEmit --pretty false
```

Results:

- `pnpm install --frozen-lockfile` passed.
- `pnpm prisma generate` is still blocked in this sandbox by `binaries.prisma.sh` DNS.
- Stage 21 TypeScript check was run using a temporary local `@prisma/client` declaration stub because Prisma Client cannot generate in this sandbox. The stub was deleted before packaging.
