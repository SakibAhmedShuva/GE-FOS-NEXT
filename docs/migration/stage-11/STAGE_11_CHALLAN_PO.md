# Stage 11 — Challan + Purchase Order Module Pass

## Important Next.js folder note

`app/(app)` is intentional. In the Next.js App Router, parenthesized folders are route groups. They organize routes without becoming part of the URL. For example:

- `app/(app)/dashboard/page.tsx` serves `/dashboard`
- `app/(app)/challan/new/page.tsx` serves `/challan/new`
- `app/(auth)/login/page.tsx` serves `/login`

## Challan implemented in this stage

Added real module foundations instead of placeholder pages:

- New challan page
- Existing challan edit page
- Transaction-safe next challan reference endpoint using `ChallanSequence`
- Save/load/update APIs
- `CHALLAN` projects stored in `projects`
- challan rows stored in `project_items`
- challan metadata stored in `projects.metadata.challan`
- challan log upsert/update on save
- signed copy/carrier/remarks/include-signature fields
- PDF export endpoint
- XLSX export endpoint
- export records stored in `exports`
- activity log records for create/save/export

## Purchase Order implemented in this stage

Added real admin-only module foundations instead of placeholder pages:

- New PO page
- Existing PO edit page
- Admin-only API enforcement
- Save/load/update APIs
- PO-from-offer endpoint
- Original offer project link through `parentProjectId`
- Original offer reference preserved in metadata
- PO terms preserved in metadata
- PO rows stored in `project_items`
- PO PDF export endpoint
- PO XLSX export endpoint
- export records stored in `exports`
- activity log records for create/save/export

## Still not final parity

This stage makes Challan and PO usable end-to-end, but exact old PDF/XLSX visual parity still needs golden comparison against the old Flask outputs. Current PDFs are lightweight generated PDFs, not final letterhead/logo/signature-perfect business documents.

Do not cut over production until old-vs-new export comparisons pass for Offer, Challan, and Purchase Order.
