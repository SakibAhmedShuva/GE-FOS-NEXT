# Stage 8 — Larger offer workflow batch

This stage intentionally combines several old offer-builder dependencies in one update so the migration does not progress one tiny file at a time.

## Implemented

### Client selector

- Added client search inside the offer builder.
- Uses the DB-backed `/api/clients/search` route.
- Selecting a client copies name/address into the project snapshot.
- Manual client name/address editing remains available.
- This preserves the old behavior that saved projects keep a client snapshot instead of relying on future client master changes.

### Catalog picker upgrade

- Added product type, make, approvals, and model filters inside the offer builder.
- Loads filter options from `/api/catalog/filter-options`.
- Keeps source filtering: all / foreign / local.
- Keeps negative keyword backend search support.
- Preserves catalog metadata into offer rows when adding an item.

### Visible columns foundation

- Added visible column controls for:
  - foreign price
  - PO price
  - local supply
  - installation
- Added `Auto from rows` helper.
- These settings are saved in `offer_settings.visibleColumns` and will be used by export parity work.

### T&C/signature state foundation

- Added controls for international supply, local supply, and installation T&C state.
- Added custom T&C note field.
- Keeps include-signature switch.
- Saved into `offer_settings.tncState` and `offer_settings.includeSignature`.

### Cover selection foundation

- Added `GET /api/covers`.
- Added cover search/select UI inside the offer builder.
- Selected cover ID is saved into `offer_settings.selectedCoverId`.

## Still pending after this batch

- cover PDF upload endpoint
- cover thumbnail serving endpoint
- rich description editor
- financial labels editor
- summary page controls
- old save-as / duplicate / reference conversion workflow
- PDF/XLSX document generation parity
- challan and purchase order module parity

### Cover upload foundation

- Added `POST /api/covers/upload`.
- Accepts PDF only.
- Enforces 25 MB max file size.
- Stores files under `FOS_STORAGE_ROOT` or `./storage` using random storage keys.
- Preserves original filename in DB.
- Logs `cover_uploaded` in activity logs.
- Offer builder can upload a PDF cover and immediately select it.

New helper:

- `lib/storage/local-storage.ts`
