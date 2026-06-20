# Stage 6 — Project routes and offer reopen/edit loop

This stage keeps using the clean Next.js/Node.js project from Stage 4 as the base and only changes updated files.

## Implemented

### Offer reopen/edit loop

Saved offers are no longer write-only records.

Added:

- `/offer/[projectId]` editor route
- server-side project access check before rendering the editor
- serialized offer DTO so Prisma Decimal/Date values are safe for React client props
- `GET /api/offers/[projectId]` now returns serialized data
- `POST /api/offers` and `PUT /api/offers/[projectId]` now return serialized saved data
- offer editor now accepts an existing project and updates it using `PUT`
- newly-created offers redirect from `/offer/new` to `/offer/[projectId]`

### Project list actions

The project table now has:

- reference search
- New Offer shortcut
- Open action
- Delete action for owned projects
- route mapping by project type

### Non-offer project route placeholders

Because challan, purchase order, and AI helper full editors are not migrated yet, dynamic routes are now wired to project-aware placeholders instead of dead 404 pages:

- `/challan/[projectId]`
- `/purchase-order/[projectId]`
- `/projects/[projectId]`

These pages verify login and project permission, then show project summary/counts. They intentionally do not pretend the full editor is complete.

## Still pending

- full spreadsheet-like offer builder
- catalog item picker drawer
- rich description editor
- visible column panel
- T&C editor
- cover selector
- summary scope editor
- PDF/XLSX export engine
- challan editor/export
- purchase order editor/export
