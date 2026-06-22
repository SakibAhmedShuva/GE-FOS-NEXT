# Stage 20 — Customer PDF Cleanup and Cover Merge Warning

This stage addresses the review after GE-FOS-NEXT(5).

## Fixed now

### Internal/debug PDF lines removed

The Offer PDF no longer prints customer-facing debug/internal lines such as:

- `Selected Cover ID`
- `Document Settings`
- `Visible Columns JSON`
- `T&C State JSON`
- `Summary Scope Descriptions JSON`

Those details remain available through export metadata and saved project settings only.

### Business-facing terms only

Offer PDF and XLSX now convert T&C state into business-facing terms text instead of raw JSON.

Examples:

- International supply terms apply.
- Local supply terms apply.
- Installation terms apply.
- Custom T&C note text, one line per row/line.

### Cover merge failure is no longer silent

The chosen production rule is Option B:

> Allow export without cover if merge fails, but return a clear warning to the user.

Offer PDF export now returns a `warnings` array when a selected cover cannot be merged. The offer UI displays that warning in the success message instead of silently pretending the cover was included.

## Still left before final approval

- exact old Financial Offer visual layout
- exact old Challan visual layout
- exact old Purchase Order visual layout
- letterhead image placement
- logo image placement
- signature image placement
- generated cover thumbnails
- final summary page layout
- final T&C visual layout
- golden comparison with real old and new documents
- real VPS/dev build proof

## Checks run

```bash
npx --yes pnpm@10.15.1 install --frozen-lockfile
npx --yes pnpm@10.15.1 prisma generate
npx --yes tsc --noEmit --pretty false
```

Results:

- `pnpm install --frozen-lockfile` passed.
- `pnpm prisma generate` is still blocked in this sandbox by `binaries.prisma.sh` DNS.
- Stage 20 TypeScript check was run using a temporary local `@prisma/client` declaration stub because Prisma Client cannot generate in this sandbox. The stub was deleted before packaging.
