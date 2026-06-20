# Stage 7 — Offer catalog picker

This stage connects the imported catalog/search backend to the offer builder, so offer rows are no longer limited to manual/custom rows.

## Implemented

- Added a catalog picker panel inside the offer builder.
- Catalog search uses the existing DB-backed `/api/catalog/search` route.
- Supports source filter:
  - all
  - foreign
  - local
- Supports the old negative keyword style through the backend search route, for example:
  - `pump -diesel`
- Results show source, code, product type, description, offer price, PO price, and installation price.
- Add button converts a catalog result into an offer row.

## Mapping rules used when adding catalog items

### Foreign catalog item

- `offerPrice` → `foreignPriceUsd`
- `poPrice` → `poPriceUsd`
- `installationPrice` → `installationPriceBdt`
- `catalogItemId`, `itemCode`, `make`, `model`, `approvals`, `descriptionHtml`, and `descriptionPlain` are preserved.

### Local catalog item

- `offerPrice` → `localSupplyPriceBdt`
- `installationPrice` → `installationPriceBdt`
- `poPriceUsd` and `foreignPriceUsd` remain zero.
- catalog metadata is preserved.

## Why this was next

The old app's offer builder depends heavily on item search and foreign/local item selection. Building screens without this would create a pretty but functionally incomplete offer workflow.

## Still pending in offer builder

- filter dropdowns inside picker for product type/make/model/approval
- client search selector
- rich description editor
- keyboard/spreadsheet editing polish
- visible column panel
- financial labels editor
- T&C editor
- cover selector
- summary page controls
- duplicate/save-as/reference conversion workflow
- PDF/XLSX export parity
