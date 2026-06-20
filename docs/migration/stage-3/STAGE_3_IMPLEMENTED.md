# Stage 3 Implementation Notes

Stage 3 starts the dangerous parity layer: catalog/search/admin endpoints and centralized offer calculations.

## Implemented

### Centralized offer calculation engine

Added `lib/calculations/offer.ts`.

It ports the key old `static/offer.js` total behavior into a reusable server/client-safe module:

- item total normalization from qty × unit price when total is missing
- foreign subtotal and grand total
- PO subtotal and grand total
- local supply subtotal and grand total
- installation subtotal and grand total
- freight and discounts
- delivery
- VAT percentage/manual logic
- AIT percentage/manual logic
- automatic total-in-BDT from foreign grand total × conversion rate
- automatic customs duty from total-in-BDT × customs duty percentage
- customs duty round-up to nearest 100
- freight-sensitive foreign labels:
  - `Subtotal, Ex-Works:`
  - `Grand Total, CFR, Chattogram (USD):`
  - fallback `Grand Total, Ex-Works (USD):`

Added `POST /api/offer/calculate` so UI and export code can use the same calculation source.

### Catalog search parity endpoints

Added:

- `GET /api/catalog/search`
- `GET /api/catalog/filter-options`
- `GET /api/catalog/sheet-names`

Search preserves:

- source filter: foreign/local/custom/all
- product type filter
- make filter
- approvals filter
- model filter
- negative keywords with `-keyword`

### Admin catalog endpoints

Added:

- `PATCH /api/admin/catalog/items/[itemId]/price`
- `POST /api/admin/catalog/autofill-installation`
- `POST /api/admin/catalog/reindex`

These are admin-session protected and write activity logs.

### Catalog workbook inventory from uploaded old stable app

Using the same old rule of valid description + positive PO price:

- Foreign workbook total valid items: 3,621
  - FPS: 2,787
  - FDS: 577
  - FD: 70
  - FC: 9
  - GSS: 178
- Local workbook total valid items: 1,152
  - FPS: 977
  - FDS: 174
  - MISC: 1

These counts should be matched by `import-catalog-workbooks.mjs` after dependency install.

## Still blocked / next stage

- Build actual offer table UI using `calculateOfferTotals`.
- Create save/load API that writes `project_items` and `offer_settings` together transactionally.
- Build export document model so PDF/XLSX uses the same calculation output.
- Add semantic embedding/vector search after text search parity is working.
- Add real background worker for heavy reindex/export jobs.

