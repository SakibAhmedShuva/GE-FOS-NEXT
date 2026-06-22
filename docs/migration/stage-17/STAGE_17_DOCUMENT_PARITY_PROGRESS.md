# Stage 17 — Document Parity Progress

This stage focuses only on the remaining production blockers around document quality/parity.

## Fixed now

### PDF item truncation removed

The previous PDF foundations truncated rows:

- Offer PDF: first 32 items
- Purchase Order PDF: first 36 items
- Challan PDF: first 38 items

That truncation is removed. The PDF generator now writes all item rows across multiple pages using a shared paginated PDF writer.

Updated:

- `lib/document-generation/basic-pdf.ts`
- `lib/document-generation/offer-pdf.ts`
- `lib/document-generation/challan-pdf.ts`
- `lib/document-generation/purchase-order-pdf.ts`

### Multi-page PDF foundation added

The shared PDF writer now supports:

- automatic line wrapping
- automatic page splitting
- page numbers
- no deliberate item truncation

This is still not old-layout visual parity yet. It is a safer foundation that preserves full item lists.

### Cover upload and thumbnail routes added

Added:

- `app/api/covers/upload/route.ts`
- `app/api/covers/[coverId]/thumbnail/route.ts`

Cover upload accepts PDF covers and stores them safely. Thumbnail route safely serves stored thumbnail files when available. Actual thumbnail generation and cover merge still need final parity implementation.

### Golden comparison tooling added

Added:

- `scripts/compare-golden-documents.mjs`
- package script: `documents:compare-golden`

Usage:

```bash
pnpm documents:compare-golden /path/to/old/generated/files /path/to/new/generated/files docs/migration/golden-document-comparison.json
```

The report compares:

- matched/missing PDF/XLSX files
- file sizes
- hashes
- PDF page counts
- XLSX worksheet names

This does not replace manual visual review, but it gives a repeatable golden comparison report.

## Still left before final document approval

- true old-layout PDF parity
- letterhead visual placement
- logo visual placement
- signature visual placement
- cover merge into final PDF
- generated cover thumbnails
- final T&C layout
- final summary page layout
- exact old financial formatting
- old-vs-new visual comparison with real migrated projects

## Checks run

```bash
npx --yes pnpm@10.15.1 install --frozen-lockfile
npx --yes pnpm@10.15.1 prisma generate
npx --yes tsc --noEmit --pretty false
```

Results:

- `pnpm install --frozen-lockfile` passed.
- `pnpm prisma generate` is still blocked in this sandbox by `binaries.prisma.sh` DNS.
- Stage 17 TypeScript check was run using a temporary local `@prisma/client` declaration stub because Prisma Client cannot generate in this sandbox. The stub was deleted before packaging.
