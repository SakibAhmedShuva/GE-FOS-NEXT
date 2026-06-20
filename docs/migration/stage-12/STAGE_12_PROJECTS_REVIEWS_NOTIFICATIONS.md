# Stage 12 — Project Workflow + Reviews/Notifications

## Project workflow implemented

- Project list now supports mine/shared/admin scopes.
- Admin all-projects page added at `/admin/projects`.
- Admin sidebar includes All Projects.
- Project sharing API added.
- Project share notification created for recipient.
- Project status update API added.
- Project reference update API added.
- Delivered delete rule remains enforced through `canDeleteProject`.
- Project list UI now exposes Open, Share, Reference, Status, Delete actions where allowed.

## Review workflow implemented

- My Reviews page added.
- Review draft creation API added.
- User can send review request to admin.
- Admin Reviews page added.
- Admin approve/reject API added.
- Approval can apply supported catalog changes:
  - description update
  - PO price update
  - offer price update
  - installation price update
  - remove/disable item marker
- User notification created after admin decision.
- Admin notification created when user sends request.
- Activity logs added for create/send/approve/reject.

## Notifications improved

- Notification delete UI added.
- Notification messages are rendered as text, not trusted raw HTML.
- Existing mark-read flow preserved.

## Build check

`pnpm install --frozen-lockfile` already passed after the lockfile was generated.

`tsc --noEmit` passed in this sandbox after the Stage 12 changes.

`prisma generate` still requires Prisma binary CDN access. Do not mark production build proof complete until `pnpm prisma generate && pnpm build` passes on the dev/VPS machine.
