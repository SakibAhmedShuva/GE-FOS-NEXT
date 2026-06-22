# Stage 23 — Logo and signature rules

This stage continues document parity only.

## Confirmed

Offer export UI already displays returned export warnings. Stage 22 added the same warning display to Challan and Purchase Order.

## Added

- Document-specific logo selection:
  - `FOS_OFFER_LOGO_STORAGE_KEY`
  - `FOS_CHALLAN_LOGO_STORAGE_KEY`
  - `FOS_PURCHASE_ORDER_LOGO_STORAGE_KEY`
- Global `FOS_LOGO_STORAGE_KEY` remains as fallback.
- Default `FOS_PDF_ASSET_MODE=letterhead-only` remains the duplicate-logo safe rule.
- Per-user signature support via `User.signatureStorageKey`.
- Admin Users page can view/update each user's signature storage key.
- PDF exports use the current user's signature storage key before the global fallback.
- Document asset migration manifest now includes `signatureCandidates` for assigning signatures to users.

## Recommended logo rule

Until visual comparison says otherwise:

```text
Offer / Challan: AMOGE logo if logo stamping is enabled
Purchase Order: NAFFCO logo if logo stamping is enabled
Default mode: letterhead-only to avoid duplicate logos
```

## Still not final

- The exact visual coordinates still need tuning against old PDFs.
- Cover thumbnail generation/display still needs final verification.
- Old-style Offer/Challan/PO table layouts still need visual parity work.
- Golden old-vs-new comparison is still mandatory.
