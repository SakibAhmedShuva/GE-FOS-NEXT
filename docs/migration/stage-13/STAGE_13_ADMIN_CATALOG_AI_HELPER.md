# Stage 13 — Admin Catalog/User/Messaging + AI Helper

## Admin catalog/tools implemented

- `/admin/catalog` screen added.
- Catalog search from admin screen.
- Master price update UI using existing item price API.
- Price list `.xlsx` upload UI and API.
- Price list upload creates a `price_list_imports` row and stores file in local storage.
- Autofill installation UI wired to API.
- Reindex UI wired to API.

The uploaded price-list file is staged for import. The existing CLI/script import path remains the safer path for full workbook parsing and row/error reporting until the UI importer is expanded to execute the full workbook import in a worker.

## Admin user management implemented

- `/admin/users` is now a real admin screen.
- Admin can create users with hashed passwords.
- Admin can enable/disable users.
- Admin can toggle user role.
- Admin can reset password.
- User actions are activity logged.

## Admin messaging implemented

- `/admin/messages` screen added.
- Admin can send notification to one active user by email or all active users.
- Message HTML is sanitized before storage.
- Message send is activity logged.

## AI Helper implemented

- `/ai-helper` is now a real upload/match/convert screen.
- `.xlsx` upload endpoint added.
- Header row detection added.
- Description/qty/unit/unit price column detection added.
- Footer cleanup added for total/grand total/signature/prepared rows.
- Catalog matching added using imported catalog search text.
- Source filter supports foreign/local/both.
- User can select matched rows.
- User can save AI-helper project.
- User can convert selected rows to a real offer project.

## Type/build check

`tsc --noEmit` passed after this stage.

Full production `pnpm build` still depends on a real `prisma generate` run. In this sandbox, Prisma engine CDN DNS remains the blocker.
