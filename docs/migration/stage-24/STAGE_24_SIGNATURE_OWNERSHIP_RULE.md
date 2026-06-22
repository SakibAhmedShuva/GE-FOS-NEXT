# Stage 24 — Signature ownership rule

This stage resolves the exporter-vs-prepared-by signature ambiguity.

## Final rule

PDF exports should use the document owner/prepared-by signature first, not always the user clicking Export.

## Applied behavior

- Offer PDF: uses project owner `User.signatureStorageKey`; current exporter is fallback.
- Challan PDF: uses challan prepared-by user signature from the latest challan log; project owner is fallback; current exporter is final fallback.
- Purchase Order PDF: uses Purchase Order project owner signature; current exporter is fallback.
- All document types still fall back to `FOS_SIGNATURE_STORAGE_KEY` inside the asset stamping helper if no user-specific key exists.

## Metadata

PDF export metadata now records `signatureSourceUserId` so the generated document can be audited.

## Still required

- Populate `User.signatureStorageKey` from the document asset manifest.
- Visually verify signature coordinates against old PDFs.
- Continue old-layout PDF/XLSX parity and golden comparison.
