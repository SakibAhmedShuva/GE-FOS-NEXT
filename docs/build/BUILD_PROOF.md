# Build proof status

This stage adds the build-safety structure that was missing:

- protected `(app)` layout using the server session
- user-aware sidebar/topbar
- admin-only sidebar section
- initial Prisma migration folder
- Prisma migration lock file
- Node/Next API remains the backend; Flask is not copied into this clean project

## Commands attempted in this sandbox

```bash
cd /mnt/data/fos_next_full_clean
pnpm --version
```

Result:

```text
bash: pnpm: command not found
```

Then:

```bash
corepack prepare pnpm@10.15.1 --activate
```

Result:

```text
Error when performing the request to https://registry.npmjs.org/pnpm/-/pnpm-10.15.1.tgz
getaddrinfo EAI_AGAIN registry.npmjs.org
```

Then an npm lock-only attempt was tried, but the sandbox package registry request timed out.

## What this means

A real `pnpm-lock.yaml`, `pnpm install`, `pnpm prisma generate`, and `pnpm build` could not be completed inside this sandbox because package-manager download/registry access is unavailable.

I am not claiming a successful build proof until those commands run on a machine with registry access.

## Required command sequence on the dev/VPS machine

```bash
corepack enable
corepack prepare pnpm@10.15.1 --activate
pnpm install
pnpm prisma generate
pnpm build
```

After that, commit the generated `pnpm-lock.yaml` and any build fixes.
