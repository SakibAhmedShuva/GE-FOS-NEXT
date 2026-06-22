# Stage 19 — Cover Merge and PDF Marker Cleanup

This stage focuses on the remaining document-parity blockers instead of adding unrelated modules.

## Fixed now

### Visible pending markers removed from PDFs

The generated PDF text no longer prints lines like:

- `Letterhead/Logo: pending visual asset placement`
- `Cover Merge: pending final PDF merge parity`

The remaining parity status is tracked in docs and export metadata, not printed inside the customer-facing PDF body.

### Offer cover merge implemented

Added `pdf-lib` and a PDF post-processing helper:

- `lib/document-generation/pdf-postprocess.ts`

Offer PDF export now:

1. generates the base offer PDF
2. reads the selected cover PDF from safe storage when one is selected
3. prepends all cover pages to the generated offer PDF
4. saves the merged final PDF
5. records `coverMerged` and `coverMergeReason` in export metadata

Updated:

- `app/api/exports/offer/pdf/route.ts`
- `lib/services/offer-project.service.ts`
- `lib/document-generation/offer-document.ts`

### PDF foundation still keeps full item lists

The Stage 17 multi-page/no-truncation PDF foundation remains in place.

## Still left before final visual parity approval

- exact old Financial Offer visual layout
- exact old Challan visual layout
- exact old Purchase Order visual layout
- logo placement
- letterhead placement
- signature image placement
- generated cover thumbnail images
- final T&C layout
- final summary page visual layout
- visual inspection against old outputs

## Checks run

```bash
npx --yes pnpm@10.15.1 install --frozen-lockfile
npx --yes pnpm@10.15.1 prisma generate
npx --yes tsc --noEmit --pretty false
```

Results:

- `pnpm install --frozen-lockfile` passed.
- `pnpm prisma generate` is still blocked in this sandbox by `binaries.prisma.sh` DNS.
- Stage 19 TypeScript check was run using a temporary local `@prisma/client` declaration stub because Prisma Client cannot generate in this sandbox. The stub was deleted before packaging.
