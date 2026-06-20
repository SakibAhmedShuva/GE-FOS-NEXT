# Legacy Migration Scripts

Run these after installing dependencies and setting `DATABASE_URL`.

## 1. Audit old system

```bash
node scripts/audit-legacy-system.mjs "/path/to/Financial-Offer-Challan-Purchase-Order-System Stable" docs/migration/latest-audit.json
```

## 2. Dry-run data migration

```bash
node scripts/migrate-current-system/import-legacy-system.mjs "/path/to/Financial-Offer-Challan-Purchase-Order-System Stable" --out docs/migration/stage-2/import-dry-run.json
```

## 3. Write legacy CSV/JSON data into PostgreSQL

```bash
node scripts/migrate-current-system/import-legacy-system.mjs "/path/to/Financial-Offer-Challan-Purchase-Order-System Stable" --write
```

Default behavior forces password reset instead of preserving old plaintext passwords.

## 4. Import catalog workbooks

```bash
FOS_CATALOG_MARKUP=0.08 node scripts/migrate-current-system/import-catalog-workbooks.mjs "/path/to/Financial-Offer-Challan-Purchase-Order-System Stable" --write
```

## Important

Do not commit the old stable folder, old `.env`, generated exports, signatures, or user CSV into Git. The scripts read them from a local migration source path and write normalized data into PostgreSQL/storage.
