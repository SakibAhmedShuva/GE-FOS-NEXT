# Stage 2 Implementation Notes

Stage 2 adds the first real backend migration and API implementation layer.

## Implemented

### Import foundations

- Added reusable migration helpers in `scripts/migrate-current-system/common.mjs`.
- Added `scripts/migrate-current-system/import-legacy-system.mjs`.
- Added `scripts/migrate-current-system/import-catalog-workbooks.mjs`.
- Added dry-run import summary at `docs/migration/stage-2/import-dry-run-summary.json`.

The legacy importer maps:

- users from `authorization/users.csv`
- clients from both `clients.csv` and `data_storage/clients.csv`
- projects from `data_storage/projects/*.json`
- project items from legacy project JSON
- offer settings from legacy project JSON
- covers from `assets/covers`
- shares from `data_storage/project_shares.csv`
- notifications from `data_storage/notifications.csv`
- chat messages from `data_storage/chat_history.csv`
- activity rows from `data_storage/activity_log.csv`
- generated exports from `data_storage/FOS`

### Auth and sessions

- Added DB-backed login route: `POST /api/auth/login`.
- Added logout route: `POST /api/auth/logout`.
- Added current-user route: `GET /api/auth/me`.
- Replaced the Stage 1 placeholder session with signed HTTP-only cookie verification.
- Added login form under `app/(auth)/login/page.tsx`.

### Initial protected APIs

- `GET /api/clients/search`
- `GET /api/catalog/search`
- `GET /api/projects?scope=mine|shared`
- `POST /api/projects`
- `GET /api/projects/[projectId]`
- `DELETE /api/projects/[projectId]`
- `GET /api/admin/activity`
- `GET /api/notifications`
- `PATCH /api/notifications/[notificationId]/read`
- `DELETE /api/notifications/[notificationId]`

These routes use server session identity and do not trust frontend-sent `email` or `role`.

## Dry-run result against uploaded stable app

- users: 12 including one inactive `legacy-orphan@local.invalid` fallback user
- clients: 37 after merging both client CSV sources
- projects: 79
- project items: 482
- offer/settings records: 67
- shares: 9
- notifications: 20
- chat messages: 43
- covers: 14
- generated exports matched to projects: 49
- generated exports unmatched by exact reference: 65
- activity rows: 940
- migration errors after tolerant parsing: 0

The 65 unmatched generated files are warnings, not failures. Many generated files appear to be older exports without a corresponding current project JSON reference, renamed/versioned exports, or archived files. They should remain copied into storage during final cutover even if not linked to a project row.

## Password migration behavior

By default, the importer does **not** keep legacy plaintext passwords as usable long-term passwords. It creates reset-required password hashes.

To temporarily hash old passwords during a private dev migration only:

```bash
FOS_IMPORT_HASH_LEGACY_PASSWORDS=true node scripts/migrate-current-system/import-legacy-system.mjs "/path/to/legacy" --write
```

Production should force password reset.

## Catalog workbook importer

`import-catalog-workbooks.mjs` reads:

- `Price List 2017-Rev-Edited -All Item 2018.xlsx` as `FOREIGN`
- `local_items.xlsx` as `LOCAL`

It preserves workbook sheet as product type, description HTML/plain text, PO price, calculated offer price using `FOS_CATALOG_MARKUP`, installation, unit, make, approvals, model, and source workbook metadata.

