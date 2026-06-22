# Stage 22 — Export warnings and PDF asset migration controls

This stage continues document parity only.

## Added

- Challan export UI now displays returned PDF/XLSX warnings.
- Purchase Order export UI now displays returned PDF/XLSX warnings.
- PDF asset stamping now supports a logo/letterhead mode:
  - `none`
  - `letterhead-only`
  - `logo-only`
  - `both`
- Default asset mode is `letterhead-only` to avoid duplicate company logos when the letterhead already contains the logo.
- First-page and continuation-page letterhead storage keys are supported.
- Logo and signature coordinates are configurable by environment variables.
- Purchase Order signature stamping is configurable via `FOS_PO_INCLUDE_SIGNATURE=true`.
- Added `scripts/migrate-current-system/import-document-assets.mjs` to copy old letterhead/logo/signature files into `FOS_STORAGE_ROOT`.

## Migration command

```bash
pnpm migration:document-assets /path/to/old/stable/folder
```

The command copies likely old document assets and writes a manifest under `docs/migration/document-assets-manifest.json`.

## Still not final

This stage does not claim exact old visual parity. The remaining PDF/XLSX work is still:

- exact old Offer layout
- exact old Challan layout
- exact old Purchase Order layout
- final T&C visual layout
- final summary-page visual layout
- final letterhead/logo/signature coordinate tuning
- golden old-vs-new comparison
