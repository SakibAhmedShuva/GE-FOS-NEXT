# Stage 30 — Document parity completion code package

This package is the consolidated code-side document generator update.

## Included

- Offer PDF generator from Stage 29.
- Challan PDF generator from Stage 28.
- Purchase Order PDF generator from Stage 28.
- Shared grouped-header PDF renderer.
- Offer XLSX generator moved closer to old `xlsx_gen.py` behavior.
- Challan XLSX generator moved closer to old `xlsx_gen.py` behavior.
- Purchase Order XLSX generator moved closer to old `xlsx_gen.py` behavior.

## Old source files used

- `pdf_gen.py`
- `xlsx_gen.py`
- old `data_storage/FOS` generated PDF/XLSX inventory
- `data_storage/challan.xlsx`

## Honest status

The code-side generator package is consolidated, but old-vs-new proof cannot be honestly marked complete inside this sandbox because the latest full Next.js app and database-backed migrated projects are not available here to generate the new side of the comparison.

## Required comparison after applying

Run the real app export flow for matching migrated projects, then run:

```bash
pnpm documents:compare-golden /path/to/old/data_storage/FOS /path/to/new/storage/exports docs/migration/golden-document-comparison.json
```

Manually inspect:

- sample old Offer PDF vs new Offer PDF
- sample old Challan PDF vs new Challan PDF
- sample old PO PDF vs new PO PDF
- sample old Offer XLSX vs new Offer XLSX
- sample old Challan XLSX vs new Challan XLSX
- sample old PO XLSX vs new PO XLSX

Any remaining visual differences should be listed in the golden comparison report.
