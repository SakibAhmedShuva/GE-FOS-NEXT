# Stage 25 — Signature metadata and Challan prepared-by stability

This stage fixes misleading signature audit metadata and locks the Challan prepared-by rule.

## Signature metadata

PDF exports now record:

```text
signatureRequested
signatureApplied
signatureSourceType
signatureSourceUserId
```

`signatureSourceUserId` is only set when the selected source is `preparedBy`, `owner`, or `exporter`. It is `null` for `global` and `none`.

## Source resolution

Offer:

```text
owner -> exporter -> global -> none
```

Challan:

```text
preparedBy -> owner -> exporter -> global -> none
```

Purchase Order:

```text
owner -> exporter -> FOS_PO_SIGNATURE_STORAGE_KEY -> FOS_SIGNATURE_STORAGE_KEY -> none
```

## Challan prepared-by rule

For existing challans, saving/editing no longer overwrites `preparedByUserId`. This keeps the original prepared-by/signature owner unless a future explicit manual prepared-by control is added.

## Still required

- Assign real `User.signatureStorageKey` values.
- Visually tune coordinates.
- Finish old-style PDF/XLSX parity.
- Run golden old-vs-new comparison.
