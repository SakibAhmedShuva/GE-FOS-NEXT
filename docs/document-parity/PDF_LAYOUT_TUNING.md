# PDF layout tuning

Use these variables after comparing generated PDFs against old Flask outputs:

```bash
FOS_PDF_TITLE_Y=800
FOS_PDF_SUBTITLE_Y=783
FOS_PDF_SEPARATOR_Y=775
FOS_PDF_CONTENT_TOP_Y=760
FOS_PDF_BOTTOM_Y=125
FOS_SIGNATURE_SAFE_PADDING=18
```

Signature reserve rule:

```text
reserved bottom area >= FOS_SIGNATURE_Y + FOS_SIGNATURE_MAX_HEIGHT + FOS_SIGNATURE_SAFE_PADDING
```

Rich descriptions preserve line breaks from:

```text
<br>
</p>
</li>
```

Offer PDF visible columns are read from `model.visibleColumns`. The renderer supports multiple legacy/new aliases for item code, qty, unit, make/model, foreign price, foreign total, local supply, installation, and PO columns.
