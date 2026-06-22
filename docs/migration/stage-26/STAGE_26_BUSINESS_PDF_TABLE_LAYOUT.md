# Stage 26 — Business PDF table layout foundation

This stage starts final document layout parity work by replacing the plain text PDF body with a shared business-document PDF renderer.

## Added

- `lib/document-generation/business-pdf.ts`
- table header drawing
- bordered item tables
- wrapped rich/plain descriptions
- automatic row height calculation
- automatic page breaks
- repeated table headers on continuation pages
- page numbers
- reserved lower-page space for footer/signature stamping

## Updated PDFs

- Financial Offer PDF now uses a business table layout.
- Challan PDF now uses a business table layout.
- Purchase Order PDF now uses a business table layout.

## Preserved

- Existing letterhead/logo/signature stamping hooks remain after PDF generation.
- Offer selected-cover merge remains after asset stamping.
- Full item lists remain preserved; item truncation is not reintroduced.

## Still required

This is a stronger layout foundation, but still needs old-vs-new tuning for:

- exact old column ordering/widths
- exact old fonts/sizes
- final T&C visual layout
- Offer summary page visual layout
- signature coordinate tuning
- logo/letterhead visual tuning
- XLSX parity
- golden comparison against old Flask exports
