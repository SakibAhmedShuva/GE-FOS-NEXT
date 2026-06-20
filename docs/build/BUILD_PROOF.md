# Build / Deployment Safety Proof

## Route group note

`app/(app)` is correct Next.js App Router syntax. It is a route group used to organize protected app pages without changing URLs. Example: `app/(app)/dashboard/page.tsx` becomes `/dashboard`.

## Commands run in this sandbox

```bash
npx --yes pnpm@10.15.1 import
npx --yes pnpm@10.15.1 install --ignore-scripts --frozen-lockfile
npx --yes pnpm@10.15.1 prisma generate
npx --yes pnpm@10.15.1 build
npx --yes tsc --noEmit --pretty false
```

## Result

- `pnpm-lock.yaml` was generated.
- `pnpm install --frozen-lockfile` completed.
- The app now avoids remote Google font downloads, so builds do not fail on `fonts.googleapis.com`.
- `tsc --noEmit` passed after Stage 12 updates.
- Next production build compiled the app, then could not honestly complete full data/build proof because Prisma Client generation is blocked by Prisma binary CDN DNS in this sandbox.

## Blocker in this sandbox

`prisma generate` could not finish because this sandbox could not resolve Prisma binary CDN DNS:

```text
getaddrinfo EAI_AGAIN binaries.prisma.sh
```

Because Prisma Client generation failed, a true production `pnpm build` cannot be honestly marked passed inside this sandbox. After Prisma binary access works on the dev machine/VPS, run:

```bash
pnpm install --frozen-lockfile
pnpm prisma generate
pnpm build
```

## Fixes added during build pass

- Added `pnpm-lock.yaml`.
- Added protected app layout earlier.
- Added admin/user-aware sidebar earlier.
- Removed `next/font/google` dependency so offline/VPS builds do not call Google Fonts.
- Raised TypeScript target to `es2017` to avoid `Set` iteration build errors.
- Fixed strict TypeScript issues found during build checks.

Do not claim launch-ready until the above three production commands pass on a machine that can reach Prisma binary CDN or has Prisma engines cached.


## Latest check

Stage 13 added admin catalog/user/messaging and AI Helper. `npx --yes tsc --noEmit --pretty false` passed after these changes.


## Latest check Stage 14

Stage 14 added chat and final migration verification. `npx --yes tsc --noEmit --pretty false` passed after these changes.
