# Stage 14 — Chat + Final Migration Cleanup

## Chat implemented

- `/chat` page added.
- User list endpoint added.
- Presence heartbeat endpoint added.
- Private conversation read endpoint added.
- Private message send endpoint added.
- Message read marking added when opening a conversation.
- Chat notification created for recipient.
- Attachment upload endpoint added.
- Attachment download endpoint added with sender/recipient/uploader access checks.
- Chat UI supports user list, online/offline indicator, unread badge, attachments, send, polling refresh, and minimize/restore.

This is implemented with HTTP polling + presence heartbeat. It does not require a custom Socket.IO server yet, so it works with the current Next.js deployment model. A dedicated Socket.IO/WebSocket service can replace the polling layer later without changing the DB schema.

## Final migration cleanup added

- `scripts/migrate-current-system/verify-final-migration.mjs` added.
- `migration:verify-final` package script added.
- The script produces `migration-final-verification-report.json` with:
  - project count
  - generated export count
  - cover count
  - chat attachment count
  - client/user/notification/review/share/chat-history CSV counts
  - malformed project JSON list
  - duplicate reference list
  - unmatched generated export list

Run it against the old stable folder before cutover:

```bash
pnpm migration:verify-final /path/to/old/stable/folder
```

## Remaining production truth

The app now has replacements for all major old modules, but production cutover is still blocked until:

1. `pnpm prisma generate` passes on the dev/VPS machine.
2. `pnpm build` passes after Prisma Client generation.
3. Golden old-vs-new PDF/XLSX comparisons are reviewed for Offer, Challan, and Purchase Order.
4. Final migration verification report is reviewed and unmatched exports are either linked or archived.
