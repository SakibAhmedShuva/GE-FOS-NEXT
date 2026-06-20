# Stage 9 — Offer XLSX export foundation

This stage starts the document-generation workstream. PDF/XLSX parity is one of the biggest risks in the migration, so the first export work is now wired end-to-end for saved offers.

## Implemented

### Neutral offer document model

Added:

- `lib/document-generation/offer-document.ts`

The document model converts a saved offer project into a single export-ready structure containing:

- reference number
- client snapshot
- prepared-by user
- visible columns
- items
- calculation totals
- labels
- T&C state
- selected cover ID
- signature flag

This prevents UI totals and export totals from drifting later.

### XLSX generator

Added:

- `lib/document-generation/offer-xlsx.ts`

The generator creates a first-pass financial offer workbook with:

- reference/client/prepared-by header
- item rows
- visible-column aware price columns
- foreign, PO, local, installation totals
- freight/discount/customs summary
- T&C state record

This is not final visual parity yet, but it is now a real generated XLSX file from the saved project data.

### Export API and download route

Added:

- `POST /api/exports/offer/xlsx`
- `GET /api/exports/[exportId]/download`

The export API:

- checks authenticated user access to the offer
- builds the document model
- generates XLSX bytes
- stores the file under local storage
- creates an `exports` table record
- logs `offer_xlsx_exported` in activity logs
- returns a download URL

The download route:

- checks authenticated user access through the linked project
- streams the generated file with a safe attachment filename

### Offer UI integration

The offer builder now has an `Export XLSX` button. It is disabled until the offer is saved, then generates and opens the download URL.

## Still pending

- match old XLSX visual layout exactly
- legacy sheet/terms/signature/logo formatting
- formula-vs-static-value decision
- PDF generator
- cover merge into generated PDF
- golden comparison tests against old exported files
