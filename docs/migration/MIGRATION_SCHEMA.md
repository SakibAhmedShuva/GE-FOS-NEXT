# Migration Schema Notes

The Prisma schema in `prisma/schema.prisma` is intentionally wider than the first UI stage. It exists to prevent feature loss during migration.

## Core rules

1. Preserve raw legacy project JSON in `Project.legacyJson`.
2. Preserve unknown per-row fields in `ProjectItem.metadata`.
3. Store client snapshots on projects.
4. Store catalog descriptions as both sanitized HTML and plain text.
5. Use DB-backed users with password hashes only.
6. Treat files as storage keys, not raw public filesystem paths.
7. Keep an append-only activity log.
8. Capture malformed migration rows in `MigrationError`.
9. Use transaction-safe challan sequence rows.
10. Keep export metadata so generated files remain downloadable after migration.

## Suggested import order

1. Users
2. Clients
3. Catalog imports and catalog items
4. Covers and static assets
5. Projects and project items
6. Offer settings
7. Project shares
8. Review requests
9. Notifications
10. Chat messages and attachments
11. Challan logs and sequence
12. Activity logs
13. Exports/generated files
14. Verification report

## Critical fields for old project parity

`Project.legacyJson`, `ProjectItem.metadata`, and `OfferSetting.*Json` are not optional luxuries. They exist because the old app stores many workflow flags inside JSON files and frontend JS state. Removing these fields would risk losing visible columns, T&C, summary settings, categories, AI helper selections, and old unknown flags.

