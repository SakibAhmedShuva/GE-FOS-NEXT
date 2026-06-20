# Stage 1 Implementation Notes

This stage intentionally does **not** start with business screens. It locks the old-system feature matrix, database migration schema, API parity map, and audit tooling first.

## Implemented in this patch

- Added a migration-first Prisma schema for PostgreSQL.
- Added a legacy audit script that scans the extracted Flask system and emits a structured report.
- Added a captured audit report from the uploaded stable system.
- Added a feature matrix based on the uploaded stable app modules, routes, storage files, and workflows.
- Added an API route parity map from old Flask endpoints to new Next.js/Node route handlers.
- Added security/RBAC foundation helpers so new routes cannot trust frontend-sent `email` or `role`.
- Added protected app route placeholders only as route anchors, not as final screens.
- Cleaned the root metadata away from the Lumen public template so the app shell can now become the FOS system.

## Not implemented yet

The following are deliberately left for later stages because they depend on the schema and import verification created here:

- Final offer builder UI.
- Final challan builder UI.
- Final PO builder UI.
- PDF/XLSX generation parity.
- Semantic catalog search.
- Real Socket.IO chat service.
- AI helper spreadsheet matching.

## How to run the audit

From the Next.js project root after extracting the old stable app somewhere locally:

```bash
node scripts/audit-legacy-system.mjs "/absolute/path/to/Financial-Offer-Challan-Purchase-Order-System Stable" docs/migration/latest-audit.json
```

The script does not require external packages. It uses Node's built-in filesystem, CSV-ish tolerant parsing, route regex parsing, and JSON validation.

## How the next stage should proceed

1. Review `docs/migration/LEGACY_FEATURE_MATRIX.md`.
2. Review `docs/migration/API_ROUTE_MAP.md`.
3. Review `prisma/schema.prisma`.
4. Run the audit script against the real current legacy folder.
5. Build import scripts only after the schema is accepted.
6. Then start implementing catalog/search and project import before offer UI.

