# Stage 29 — Grouped headers and explicit PO visibility guard

This stage continues PDF parity only.

## Fixed now

- Offer PDF no longer depends only on hidden `model.user.role` for admin PO-column visibility.
- Offer PDF now supports explicit `model.canShowPoColumns` or `model.settings.canShowPoColumns` first.
- If no explicit flag exists, it falls back to `userRole`, `exporterRole`, then `user.role`.
- This prepares the export route/model to pass PO-column permission explicitly.
- Offer PDF now uses true grouped header support in the shared renderer:
  - `FOREIGN PRICE` spans `PRICE (USD)` and `TOTAL (USD)`.
  - `PO PRICE` spans `PRICE (USD)` and `TOTAL (USD)`.
  - `LOCAL SUPPLY PRICE` spans `PRICE (BDT)` and `TOTAL (BDT)`.
  - `INSTALLATION PRICE` spans `PRICE (BDT)` and `TOTAL (BDT)`.
- Offer PDF title is restored to `FINANCIAL OFFER` instead of switching to `BILL OF QUANTITIES` globally.
- Financial totals section is now labeled `PRICE SUMMARY` for closer old-output parity.

## Required integration note

The Offer export route/document model should pass:

```ts
canShowPoColumns: auth.user.role === "ADMIN"
```

into the document model. The renderer supports this field now.

## Still requires real comparison

- Verify the exact key name used by `buildOfferDocumentModel()` for the explicit permission flag.
- Compare generated grouped headers with old FPDF output.
- Continue exact T&C/summary layout parity.
- Continue XLSX parity.
