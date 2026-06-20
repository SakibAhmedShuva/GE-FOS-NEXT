# Clean Delivery ZIP

Use this command when making a full source delivery ZIP:

```bash
pnpm package:clean dist/ge-fos-next-clean-source.zip
```

Then verify it:

```bash
pnpm package:verify dist/ge-fos-next-clean-source.zip
```

The delivery ZIP must not include:

- `.git/`
- `node_modules/`
- `.next/`
- `.env`
- real environment files
- `storage/`
- old Flask `data_storage/`
- old `authorization/`
- old `assets/` unless intentionally migrated into the new storage plan

The delivery ZIP should include source and migration files only.
