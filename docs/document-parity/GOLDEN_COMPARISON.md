# Golden Document Comparison

Before production cutover, run old-vs-new comparisons for real migrated projects.

## Command

```bash
pnpm documents:compare-golden /path/to/old/data_storage/FOS /path/to/new/storage/exports docs/migration/golden-document-comparison.json
```

## Review checklist

For each Offer, Challan, and Purchase Order sample, compare:

- client
- reference
- item rows
- quantities
- USD totals
- BDT totals
- conversion rate
- customs duty
- amount in words
- T&C
- signature
- cover
- layout
- page count
- filename

## Important

The comparison script can flag file-count, page-count, worksheet, and hash differences. A human still must visually inspect the generated documents because exact old business layout parity cannot be proven by hashes alone.
