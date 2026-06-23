# Stage 27 — PDF visible columns and layout tuning

This stage continues document-layout parity work after the Stage 26 business-table renderer.

## Fixed now

- Offer PDF table now respects `model.visibleColumns` aliases instead of always printing all financial columns.
- Offer PDF columns auto-fit to the printable page width after hidden-column changes.
- Business PDF bottom reserve is now signature-aware so table rows cannot overlap the signature area.
- Top/title/content positions are configurable by environment variables for real letterhead tuning.
- Rich descriptions now preserve `<br>`, paragraph endings, and list item line breaks instead of collapsing everything into one paragraph.
- Challan PDF no longer prints customer-unfriendly `Signature Included: Yes/No` text.
- Offer PDF no longer prints customer-unfriendly `Authorized signature area reserved` text.
- Offer summary scope descriptions are rendered as a business-facing scope summary only when summary page is enabled.
- PDF dates use fixed `DD-MMM-YYYY` formatting with UTC instead of server-locale `toLocaleString()`.

## New layout tuning env vars

```bash
FOS_PDF_TITLE_Y=800
FOS_PDF_SUBTITLE_Y=783
FOS_PDF_SEPARATOR_Y=775
FOS_PDF_CONTENT_TOP_Y=760
FOS_PDF_BOTTOM_Y=125
FOS_SIGNATURE_SAFE_PADDING=18
```

`FOS_PDF_BOTTOM_Y` is automatically raised when signature stamping is requested and the signature height/position needs more room.

## Still required

- Exact old column names/visibility mapping review with real projects.
- Final T&C wording/layout verification against old Flask output.
- Final summary-page visual parity.
- Logo/signature/letterhead coordinate tuning with actual old PDFs.
- XLSX parity and golden comparison.
