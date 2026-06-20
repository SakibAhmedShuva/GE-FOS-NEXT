# Stage 5 — Transactional Offer Save/Load Foundation

This update adds the first real offer persistence layer.

## Added

- `lib/validators/offer-project.ts`
- `lib/services/offer-project.service.ts`
- `POST /api/offers`
- `GET /api/offers/[projectId]`
- `PUT /api/offers/[projectId]`
- Updated offer page client component to calculate and save a real offer draft.

## Behavior

`POST /api/offers` now writes, in one transaction:

- `projects`
- `project_items`
- `offer_settings`
- `activity_logs`

`PUT /api/offers/[projectId]` updates an existing offer by:

- checking server-side session identity
- checking edit permission
- refusing non-offer project IDs
- replacing project items transactionally
- upserting offer settings
- logging `offer_saved`

`GET /api/offers/[projectId]` returns an offer with:

- project core data
- items sorted by `sortOrder`
- offer settings
- owner

## Why this matters

This is the bridge between Stage 3 calculations and the final spreadsheet-like UI. The full old offer editor can now be rebuilt on top of real DB save/load instead of local-only screen state.

## Still remaining for offer parity

- edit existing offer route/page
- catalog item picker drawer
- rich description editor
- visible column panel
- T&C editor
- cover selector
- summary scope editor
- export PDF/XLSX document model
