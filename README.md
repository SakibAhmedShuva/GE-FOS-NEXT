# Financial Offer System — Next.js + Node.js Replacement

This is the clean replacement foundation for the old Flask/CSV/XLSX Financial Offer / Challan / Purchase Order system.

It intentionally excludes:

- old Flask files
- old `templates/` and `static/` frontend files
- Lumen/public-site template pages/components
- `node_modules`
- old `.env` secrets
- old generated exports and uploads

## Current implemented scope

- Next.js App Router frontend shell
- DB-backed login/logout/current-user session APIs
- HTTP-only signed session cookie
- Prisma/PostgreSQL schema
- legacy audit script
- legacy CSV/JSON import script
- catalog workbook import script
- project list APIs
- catalog search/filter APIs
- admin activity APIs
- notification APIs
- centralized offer calculation module
- route anchors for remaining workflows

## Not fully completed yet

The final offer/challan/PO editors and document generation parity are still future stages. This project is now clean enough to continue development without old template noise.

## Setup

```bash
pnpm install
cp .env.example .env
pnpm prisma:generate
pnpm prisma:migrate
pnpm dev
```

Open:

```text
http://localhost:3000
```

## Docker PostgreSQL for local development

```bash
docker compose up -d postgres
```

Then use the `DATABASE_URL` from `.env.example` or edit it as needed.

## Legacy migration flow

1. Keep the old stable app folder outside this repository.
2. Run audit:

```bash
node scripts/audit-legacy-system.mjs "/path/to/Financial-Offer-Challan-Purchase-Order-System Stable" docs/migration/latest-audit.json
```

3. Dry-run import:

```bash
node scripts/migrate-current-system/import-legacy-system.mjs "/path/to/Financial-Offer-Challan-Purchase-Order-System Stable" --out docs/migration/stage-2/import-dry-run.json
```

4. Write import:

```bash
node scripts/migrate-current-system/import-legacy-system.mjs "/path/to/Financial-Offer-Challan-Purchase-Order-System Stable" --write
```

5. Import catalog workbooks:

```bash
FOS_CATALOG_MARKUP=0.08 node scripts/migrate-current-system/import-catalog-workbooks.mjs "/path/to/Financial-Offer-Challan-Purchase-Order-System Stable" --write
```

## Password migration

Default importer behavior forces password reset. It does not preserve plaintext passwords as usable long-term credentials.

For private development only, old passwords can be hashed:

```bash
FOS_IMPORT_HASH_LEGACY_PASSWORDS=true node scripts/migrate-current-system/import-legacy-system.mjs "/path/to/legacy" --write
```

Production should force password reset.
