# Stage 4 — Clean Full Project Package

This stage creates a clean full Next.js + Node.js project package instead of a modified-files-only patch.

## Removed from the full package

- Old Flask backend files
- Old `templates/index.html`
- Old `static/*.js` frontend files
- Lumen/public-site pages
- Lumen/public-site components
- AOS/template animation dependency
- unused template images
- generated `.next` files
- `node_modules`
- old `.env` secrets

## Kept / implemented

- Next.js App Router frontend
- clean dashboard shell
- DB-backed login form
- signed HTTP-only session cookie auth
- Prisma/PostgreSQL schema
- Docker Compose PostgreSQL for local dev
- migration audit and import scripts
- catalog workbook importer
- catalog search page and APIs
- projects page and APIs
- notification page and APIs
- admin activity page and API
- offer calculation page and API
- docs explaining migration stages and parity rules

## Important status

This is now a clean project to continue from. It is not yet the final business-equivalent replacement for every old workflow. The remaining large work is:

1. Full offer table editor with save/load of `project_items` and `offer_settings`.
2. Full PDF/XLSX document model and export renderer.
3. Challan builder and sequence UI.
4. Purchase Order builder and export parity.
5. Review request UI/admin processing.
6. Real chat/presence UI and realtime service.
7. AI Helper spreadsheet wizard and semantic search.

