# Document Parity Status — Not Final Yet

The current PDF routes are foundation exports only. They prove the storage, permission, export-record, and download flow, but they are **not approved final business documents**.

Do not mark the new system production-ready until real old-vs-new parity is complete for:

- Financial Offer PDF/XLSX
- Challan PDF/XLSX
- Purchase Order PDF/XLSX

## Required PDF parity before approval

- proper business table layout
- old financial formatting
- full item list with no truncation
- rich descriptions
- letterhead placement
- logo placement
- signature placement
- cover selection and cover merge into the final PDF
- T&C layout
- summary page support
- multi-page item tables
- safe page breaks
- amount in words
- old challan format
- old purchase order format
- correct file naming

## Required XLSX parity before approval

Each generated workbook must be compared against old Flask outputs for real migrated projects:

- client details
- reference number
- items and quantities
- USD/BDT totals
- conversion rate
- customs duty
- amount in words
- T&C sections
- signature/logo/letterhead where applicable
- visible columns
- formatting and page layout

## Golden comparison rule

Use real old project JSON files and existing old generated PDFs/XLSX files as golden samples. The old Flask system must stay available until these comparisons pass and any differences are approved intentionally.
