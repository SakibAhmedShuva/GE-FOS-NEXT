# Stage 28 — Old-style PDF layout pass

This stage uses the old Flask `pdf_gen.py` layout rules as the guide instead of a generic business-table layout.

## Changed now

### Offer PDF

- Uses old visible column keys more directly:
  - `foreign_price`
  - `local_supply_price`
  - `installation_price`
  - `po_price`
- Uses old-style base columns:
  - `SL`
  - `DESCRIPTION`
  - `QTY`
  - `UNIT`
- Uses old-style price pairs:
  - `PRICE (USD)` / `TOTAL (USD)`
  - `PRICE (BDT)` / `TOTAL (BDT)`
- PO columns only appear for admin-role models when `po_price` is visible.
- Summary page label is now `PRICE SUMMARY`.
- Classic reference label is now `Ref` instead of generic `Reference`.

### Challan PDF

- Moves closer to old Challan layout:
  - `DELIVERY CHALLAN`
  - `Challan No`
  - `Client`
  - `Address`
  - Columns: `SL`, `Item Description`, `Quantity`, `Unit`
- Removes the extra item-code column that was not part of the old challan PDF.

### Purchase Order PDF

- Moves closer to old PO layout:
  - `PO Ref`
  - `Client`
  - Columns: `SL`, `Description`, `PO Price`, `Unit`, `Total`
- Removes the extra item-code column that was not part of the old PO PDF.

### Shared renderer

- Header cells now support wrapped/multiline labels such as `PRICE (USD)` and `TOTAL (BDT)`.
- Existing signature-safe spacing and line-break preservation remain.

## Still requires visual verification

- Exact old FPDF font metrics cannot be guaranteed with pdf-lib/Helvetica without visual comparison.
- Old two-level grouped price headers are approximated with multiline headers in the current renderer.
- Final coordinate tuning still requires old-vs-new generated PDFs.
- XLSX parity remains a separate pass.
