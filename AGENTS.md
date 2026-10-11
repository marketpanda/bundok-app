# Working on Ambangeg

Read `CODEX_HANDOFF.md` first for project state and continuity, then the README
for the package you change. This repository is named bundok-app; the product
name and production domain are Ambangeg and ambangeg.com.

## Structure and workflow

- `frontend/`: Next.js App Router, React, TypeScript, Tailwind and MapLibre.
  Follow `frontend/AGENTS.md`, including its installed Next.js documentation rule.
  Preserve static export (`output: "export"`, trailing slashes, unoptimized images).
- `database/`: active Neon PostgreSQL + Prisma backend, deployed through AWS
  Lambda/API Gateway; private climb photos use S3. Read `database/neon-setup-guide.md`.
  RDS files and the archived part of `database/README.md` are alternative history.
- `docs/screenshots/`: desktop/mobile review references. Capture scripts live in
  `frontend/scripts/`; use the package README for their prerequisites.

Use Node.js >=22.12.0 and the committed npm lockfiles. From `frontend`, run
`npm ci`, then `npm run dev`; validate frontend changes with `npm run lint` and
`npm run build`. The production artifact is `frontend/out/`, served statically;
`next start` is not the deployment workflow for this export.

For backend changes, use `npm ci`, `npm run generate`, `npm run typecheck` and
`npm test` from `database`. Database integration checks, migrations, seeds and
deployed smoke tests require separate credentials and may mutate real resources;
use them only within the user's authorized scope. Do not deploy just to run checks.

## Product and data constraints

- Preserve desktop and mobile usability, map/card synchronization, draggable
  mobile results, map attribution and photo credits.
- Catalogue entries do not automatically become published mountain guides.
  Guide content, sources and review dates are maintained separately.
- My Climbs is account-backed. Signed-out users see sign-in, with browser records
  retained privately for later explicit, confirmed import. Never auto-upload them.
- Authenticate API requests with Cognito access tokens. Derive ownership from
  verified identity, never a client-provided user ID. Keep owner isolation.
- Group hikes remain one journal entry and retain reached-destination snapshots.
  Multiple points on one mountain count as one mountain in Places explored.
- Keep date-only values as YYYY-MM-DD without timezone conversion. Preserve
  multi-day validation, three pin slots and photo-retry behavior without duplicates.

## Configuration and existing work

Use `.env.example` files as templates. Frontend `NEXT_PUBLIC_*` values are embedded
at build time and are visible to users. Never put Neon URLs, AWS credentials,
Google client secrets, Turnstile secrets or tokens in them or committed files.
Use the cloud environment's configuration for necessary credentials.

Inspect `git status` before editing. Preserve unrelated local changes; stage an
explicit file list. Do not bulk-add generated deployment files, recordings,
debug folders or unreviewed assets. Follow user authorization for publishing,
pushing, live data operations and infrastructure changes.
