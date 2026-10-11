# Ambangeg: local-to-Codex-web handoff

Prepared 2026-10-11 (Australia/Perth) from repository files and Git state.
This is a durable project summary, not an export of every prior conversation.
Earlier chat history was not available to the preparation session; historical
verification below is attributed to repository documentation, not rerun today.

## Start here

Repository: https://github.com/marketpanda/bundok-app

At preparation, branch `main` and the locally recorded `origin/main` both point
to `626bc1c` (`feat(map): highlight group destinations and Arayat points`). No
remote fetch was performed. The handoff files are new local files until committed
and pushed. The existing worktree is dirty; see the local-only inventory below.

The product is **Ambangeg**, a responsive Philippine hiking discovery app at
`https://ambangeg.com`. Continue the existing implementation and visual style.
There is no new feature request in this handoff: ask for the next task after
reading the project rather than assuming a redesign or deployment is wanted.

## Architecture and key files

| Area | Entry points / references |
| --- | --- |
| Static Next.js frontend | `frontend/app/`, `frontend/next.config.ts`, `frontend/README.md` |
| Home, bag-tag creator and memes | `frontend/components/hiking-app.tsx` |
| Mountain explorer and map | `frontend/components/mountain-directory.tsx`, `frontend/components/mountain-area-map.tsx`, `frontend/lib/map-*.ts` |
| Mountain profiles and coordinates | `frontend/data/mountains.ts`, `frontend/data/map-mountains.ts`, `frontend/data/national-mountains.json` |
| Layers, areas and group itineraries | `frontend/data/mountain-map-layers.ts`, `frontend/data/mountain-areas.ts`, `frontend/data/hike-itineraries.ts` |
| Published guides | `frontend/data/mountain-guides.ts`, `frontend/app/mountains/[slug]/page.tsx` |
| Account journal, API and photo preparation | `frontend/components/my-climbs-gallery.tsx`, `frontend/lib/climbs-api.ts`, `frontend/lib/climb-photo.ts`, `frontend/lib/hike-dates.ts` |
| Cognito authentication | `frontend/components/auth-provider.tsx`, `frontend/lib/amplify-auth.ts` |
| Backend and schema | `database/src/`, `database/prisma/schema.prisma`, `database/prisma/migrations/` |
| Backend deployment | `database/infra/climbs-api.template.json`, `database/neon-setup-guide.md` |
| Contact form | `frontend/components/contact-form.tsx`, `frontend/infra/contact-form/` |
| Static hosting route rewrite | `frontend/infra/cloudfront/directory-index.js` |
| Catalogue policy and photo credits | `frontend/docs/`, `frontend/public/map-data/README.md` |
| Visual review | `docs/screenshots/README.md`, `frontend/scripts/capture-screenshots.cjs` |

Frontend dependencies include Next.js 16.3.6, React 19.2.8, Tailwind 4, Base UI,
Lucide, MapLibre 6 and Amplify 6 (use lockfiles for resolved versions). Backend
uses Prisma 7.10, PostgreSQL and AWS SDKs. There is no root npm package.

## Implemented behavior to preserve

- The home screen combines Flex My Hike personalized downloadable bag tags,
  shareable hiking memes and featured guides. About Us has a Taglish hiking story.
- The explorer documents 2,015 catalogue mountains and 800 priority pins.
  Reveal All Mountains enables the secondary layer; selecting a hidden peak
  reveals it individually. Search, difficulty filters, area previews, shared map
  camera URLs and synchronized map/card selection work across responsive layouts.
- The latest map work highlights group destinations, including Kayapa child
  summits and Arayat points; use existing helpers and regression scripts.
- Pulag, Apo and Guiting-Guiting have dedicated static guide pages, metadata,
  canonical links, structured data and dated source references.
- My Climbs saves signed-in users' records through the deployed API. It supports
  single mountains, verified group itineraries, date-only/multi-day entries,
  notes, summit-not-reached state, layouts and up to three pinned favourites.
- Signed-out users see sign-in, with journal controls/cards hidden. Existing
  browser records remain stored. Import is explicit, confirmed and repeat-safe,
  preserves local originals, and can include saved local photos.
- One photo per account climb: browser JPG/PNG/WebP input up to 15 MB is prepared
  as JPEG; the API validates/re-encodes it and saves it to private encrypted S3.
  Neon stores object keys. Signed image URLs renew on focus and after 45 minutes.
  Replacement, removal and climb deletion queue object cleanup; failed photo
  saves retain the climb ID so retries do not create duplicate journal entries.

## Services and deployment status

The active database path is **Neon + Prisma**, not RDS. The Lambda/API Gateway
stack is documented as `ambangeg-climbs-dev` in `ap-southeast-2` (Sydney).
Public climbs API: `https://2x47fd2ckf.execute-api.ap-southeast-2.amazonaws.com`.
The restricted runtime database URL is stored in AWS Parameter Store at
`/ambangeg/dev/DATABASE_URL`; do not copy its value into the handoff or browser.
Cognito handles authentication, with Google as a federated identity provider.
The contact form uses Lambda/SES plus Cloudflare Turnstile.

Repository documentation records deployed API authorization checks, user-confirmed
signed-in climb saving, group/ownership checks and a disposable Lambda/Neon/S3
photo smoke test. That photo test used synthetic identity claims for direct Lambda
invocations and does not substitute for real browser authentication testing.

`database/neon-setup-guide.md` lists real browser photo verification and frontend
publication as remaining work. Treat this as the last documented checkpoint;
confirm actual current production state before publishing or claiming it is live.
Some older root README text describes local gallery persistence and the database
README includes archived RDS instructions; prefer the active frontend/Neon sections.

Static frontend publishing means building and uploading `frontend/out/` through
the existing S3/CloudFront process. Preserve exported directory index routing and
JavaScript MIME types for generated MapLibre worker/shared assets. A frontend
build neither migrates the database nor deploys Lambda.

## Cloud setup and validation

1. Connect this GitHub repository and select the intended branch in Codex web.
   Include this handoff and `AGENTS.md` in that branch first.
2. Provide Node.js >=22.12.0. Run `npm ci` in `frontend`; run `npm ci` and
   `npm run generate` in `database` if the task touches backend code.
3. Supply needed frontend values using `frontend/.env.example` as the key list.
   Set `NEXT_PUBLIC_APP_URL` to the actual permitted callback origin. Local
   development uses `http://localhost:3000/`; an arbitrary cloud preview origin
   will require matching Cognito callbacks and API CORS to test real sign-in.
4. From `frontend`, run `npm run lint` and `npm run build`. `predev`/`prebuild`
   generate MapLibre assets. Build-time font fetching may need network access.
5. Backend checks: `npm run typecheck`, `npm test`; `npm run api:build` when the
   Lambda bundle changes. Live/integration tests need credentials and their scope
   reviewed because they can create records or interact with deployed services.
6. Existing focused frontend checks include `scripts/check-map-group-highlight.cjs`,
   `check-map-url.cjs`, `check-map-region-bounds.cjs`, `check-map-cache.cjs`,
   `check-mountain-catalogue.cjs` and `check-climb-photo.cjs`.
   Read each script's prerequisites before running it.
7. `check-climbs-api.cjs` is a mock browser regression suite covering journal,
   import, account isolation and photo retry flows. It needs a running preview,
   Playwright and Chrome. Screenshot capture uses the same browser prerequisites.
   Cloud browser availability may differ from this Windows workstation.

No app tests or live service checks were rerun for this documentation-only handoff.
The Neon guide also records dependency audit findings in Prisma CLI tooling;
check the current audit before addressing them, and review compatibility before
any forced downgrade. That recorded result is not a fresh audit.

## Local-only work at preparation

Already modified: `docs/screenshots/README.md`, twelve existing desktop/mobile
PNG captures, and `frontend/scripts/capture-screenshots.cjs`. Added local captures:
`docs/screenshots/desktop-kayapa-group.png` and `mobile-kayapa-group.png`.

Other untracked paths: `.map-debug/`, `DNS_Configuration.csv`, `docs/recording.mp4`,
`frontend/public/assets/logo.png`, `logo3.png`, and mountain images `redondo.jpg`
and `ulap.jpg`. Review intended use and photo credits before adding assets.

Generated/deployment-local paths also appear untracked under
`frontend/infra/contact-form/`: `.aws-sam/`, `samconfig.toml` and
`src/__pycache__/`. Their contents were not inspected for this handoff. Do not
bulk-stage them. The corresponding database generated paths are already ignored.
Ignored environment files and credentials do not transfer through GitHub.

## Suggested first cloud prompt

> Read AGENTS.md and CODEX_HANDOFF.md, then inspect the relevant source and package
> README. We are continuing Ambangeg, not starting over. Summarize the current
> state and any setup gaps briefly, then work on: [insert the next task]. Preserve
> existing functionality and follow the validation instructions. Do not assume
> documented historical checks establish today's production state.
