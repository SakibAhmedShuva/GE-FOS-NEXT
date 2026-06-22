# PDF asset configuration

Stage 22 and Stage 23 add the asset controls needed to avoid duplicate logos, support document-specific logo rules, support per-user signatures, and make letterhead/logo/signature placement tunable without code edits.

## Storage keys

Assets are read from `FOS_STORAGE_ROOT` by storage key, not by raw filesystem path.

Recommended migrated keys:

```bash
FOS_LETTERHEAD_STORAGE_KEY=assets/letterhead.pdf
FOS_SIGNATURE_STORAGE_KEY=assets/signatures/Signature_<name>.png
```

For first-page and continuation-page letterhead differences, use:

```bash
FOS_LETTERHEAD_FIRST_PAGE_STORAGE_KEY=assets/letterhead-first.pdf
FOS_LETTERHEAD_CONTINUATION_STORAGE_KEY=assets/letterhead-continuation.pdf
```

If those are not set, the exporter falls back to `FOS_LETTERHEAD_STORAGE_KEY`.

## Duplicate logo prevention

Use `FOS_PDF_ASSET_MODE` to decide how letterhead and logo are stamped:

```bash
FOS_PDF_ASSET_MODE=letterhead-only # default; safest if letterhead already contains logo
FOS_PDF_ASSET_MODE=logo-only       # no letterhead, stamp logo image only
FOS_PDF_ASSET_MODE=both            # stamp letterhead and logo after visual confirmation
FOS_PDF_ASSET_MODE=none            # no letterhead/logo stamping
```

Default is `letterhead-only` so a company logo is not accidentally printed twice when the letterhead PDF already contains branding.

## AMOGE / NAFFCO logo rule

The app now supports both a global logo and document-specific logo keys.

Preferred rule for this migration:

```bash
# Leave global logo empty if the letterhead already contains branding.
FOS_LOGO_STORAGE_KEY=

# Use these only when FOS_PDF_ASSET_MODE is logo-only or both.
FOS_OFFER_LOGO_STORAGE_KEY=assets/amoge_logo.png
FOS_CHALLAN_LOGO_STORAGE_KEY=assets/amoge_logo.png
FOS_PURCHASE_ORDER_LOGO_STORAGE_KEY=assets/NAFFCO_Logo_New.png
```

Fallback order:

```text
explicit logo key from code, if any
then document-specific env key
then FOS_LOGO_STORAGE_KEY
```

Do not set `FOS_PDF_ASSET_MODE=both` until old-vs-new visual review confirms the letterhead does not already include the same logo.

## Per-user signature mapping

The global fallback remains:

```bash
FOS_SIGNATURE_STORAGE_KEY=assets/signatures/Signature_default.png
```

For user/prepared-by-specific signatures, set:

```text
users.signature_storage_key / User.signatureStorageKey
```

The admin Users page now exposes a signature storage key field. PDF exports use the current user's `signatureStorageKey` first, then fall back to `FOS_SIGNATURE_STORAGE_KEY`.

## Logo coordinates

Coordinates use PDF points. Origin is bottom-left.

```bash
FOS_LOGO_X=461
FOS_LOGO_Y=770
FOS_LOGO_MAX_WIDTH=92
FOS_LOGO_MAX_HEIGHT=42
```

If `X/Y` are not set, the logo is placed near the top-right.

## Signature coordinates

Signature is stamped on the final generated document page only.

```bash
FOS_SIGNATURE_X=421
FOS_SIGNATURE_Y=54
FOS_SIGNATURE_MAX_WIDTH=120
FOS_SIGNATURE_MAX_HEIGHT=55
```

If `X/Y` are not set, the signature is placed bottom-right. Final coordinates still need visual tuning against the old Flask PDFs.

## Purchase Order signature

Purchase order signature stamping is configurable:

```bash
FOS_PO_INCLUDE_SIGNATURE=true
```

Leave it unset/false if purchase orders should not carry a signature.

## Asset migration command

Copy the old stable assets into storage with:

```bash
pnpm migration:document-assets /path/to/old/stable/folder
```

The script copies likely old assets:

```text
assets/letterhead.pdf
assets/amoge_logo.png
assets/NAFFCO_Logo_New.png
authorization/Signature_*.png
authorization/Signature_*.jpg
```

It writes a manifest at:

```text
docs/migration/document-assets-manifest.json
```

Use the manifest `signatureCandidates` array to assign `signatureStorageKey` values to the matching users.

Do not call PDF asset placement final until a real old-vs-new visual comparison confirms letterhead, logo, and signature placement.
