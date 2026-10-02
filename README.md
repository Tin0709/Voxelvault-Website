# VoxelVault

An image-first showcase and archive for creative worlds, their stories, and the resources behind them.

*Your ideas. Your worlds. Your vault.*

**[Visit VoxelVault →](https://voxelvault.2002trungtin.workers.dev/)**

## About

VoxelVault brings visual portfolios and downloadable content into one place. Inspired by sharing Minecraft builds and worlds, it keeps a creation's gallery, creator and source credits, and downloadable resources together rather than scattered across image hosts and file links.

Visitors can explore public images and creator portfolios. Creators can publish their work, return to unfinished drafts, and manage their own private attachments and storage.

## Highlights

- **Visual discovery:** Pinterest-style masonry, two-column mobile browsing, single-image and multi-image showcase cards, and title/category search suggestions.
- **Natural browsing:** native touch carousels, desktop image controls, and Explore state restoration when returning from a post with browser Back.
- **Creator portfolios:** public profiles, galleries of up to 50 images per post, post editing, attribution, and external download links.
- **Private resources:** owner-only attachments with individual and ZIP downloads. Public galleries do not make private files publicly downloadable.
- **Recoverable publishing:** Finish Later drafts with cloud persistence, local fallback, conflict handling, and validation of cached uploads before reuse.
- **Personal storage:** a 1 GB account quota, usage breakdowns, and safe cleanup of unused files.
- **Account access:** Supabase authentication with configurable social providers, including Google and Facebook.

## Architecture

```text
Browser
  |
  v
React + Vite frontend
Cloudflare Workers Static Assets
  |
  v
Cloudflare Worker API — server/worker.js
  |
  +-- Supabase Auth          Identity and bearer-token verification
  +-- Supabase PostgreSQL    Posts, profiles, drafts and storage metadata
  +-- Supabase Storage       Small private non-image files
  +-- Cloudflare R2          All images and larger private files
```

The frontend and API are deployed separately. The Worker handles authorization, validation, storage access and scheduled cleanup. Database metadata governs ownership, resource associations, reservations and quota accounting.

`server/app.js` is the retained legacy Node implementation; it is **not** the production API runtime.

## Storage Model

Routing uses detected file type and byte size:

| Resource | Destination |
| --- | --- |
| All images | Cloudflare R2 |
| Non-image files smaller than 1,000,000 bytes | Supabase private Storage |
| Non-image files of 1,000,000 bytes or more | Cloudflare R2 |

- **Account quota:** 1,000,000,000 bytes (1 GB), including existing usage and reservations.
- **Per-file limit:** 50,000,000 bytes (50 MB).
- **Public gallery limit:** 50 images per post.

Private resources are delivered through authenticated, owner-checked API routes rather than permanent public R2 URLs. Public gallery images use the image-serving API; private image access uses signed URLs. Cleanup protects resources referenced by posts, valid drafts, profile avatars or covers.

## Tech Stack

| Area | Technologies |
| --- | --- |
| Frontend | React 19, React Router, JavaScript, Vite, Tailwind CSS and custom CSS |
| API / edge runtime | Cloudflare Workers, Wrangler |
| Identity and database | Supabase Auth, PostgreSQL, Supabase JavaScript client |
| File storage | Cloudflare R2, Supabase private Storage |
| Hosting | Cloudflare Workers Static Assets and a separate API Worker |

## Key Engineering Details

- **Batched feed hydration** avoids per-post database request patterns and keeps Worker subrequests bounded.
- **Stable Explore presentation** uses deterministic showcase placement and preview rotation. A short-lived, history-scoped retained page preserves loaded results, masonry and carousel state on Back.
- **Native mobile scrolling** lets the browser handle horizontal momentum and snapping while React observes the selected slide.
- **Safe upload lifecycles** validate file content, reserve quota, verify stored bytes and finalize metadata. Stale cached upload IDs are checked before reuse.
- **Recoverable cleanup** uses bounded claims and retries, including hourly scheduled execution. Already-missing objects can be finalized only after ownership and reference-safety checks.

## Project Structure

```text
.
├── README.md
└── voxelvault/
    ├── AGENTS.md                  # Architecture, invariants and contribution rules
    ├── src/                       # React pages, components and client helpers
    ├── server/                    # Production Worker and supporting helpers
    ├── supabase/
    │   └── migrations/            # Database and RPC migrations
    ├── public/                    # Public frontend assets
    ├── package.json
    ├── wrangler.jsonc             # API Worker, R2 binding and cleanup schedule
    └── wrangler.frontend.jsonc     # Frontend Static Assets configuration
```

Read [AGENTS.md](voxelvault/AGENTS.md) before changing the application. It documents the current production rules and verification workflow.

## Running Locally

Use a current supported Node.js LTS release and npm. From the repository root:

```sh
cd voxelvault
npm install
npm run dev
```

The frontend normally opens at `http://localhost:5173`. Vite proxies `/api` requests to the local Worker at `http://127.0.0.1:8787` when `VITE_API_URL` is left empty.

In a second terminal, from `voxelvault/`:

```sh
npm run worker:dev
```

Configure the environment first for authenticated/data-backed functionality. Use a development Supabase project with the required migrations applied. Local Wrangler development simulates R2; it does not use the production bucket's objects. A locally running Worker can still access whichever Supabase project its configuration names, so explicitly use development configuration for write testing.

To check the production frontend build:

```sh
npm run build
```

## Environment Variables

Names only are listed below. Keep credentials out of source control and never put backend secrets in a `VITE_*` variable: Vite exposes those values to the browser.

### Frontend

Configure these in a local, uncommitted `voxelvault/.env.local` file and in the production frontend build environment:

```env
VITE_SUPABASE_URL=
VITE_SUPABASE_PUBLISHABLE_KEY=
VITE_AUTH_PROVIDERS=
VITE_API_URL=
```

`VITE_AUTH_PROVIDERS` is a comma-separated list of enabled provider IDs; the corresponding providers and redirect URLs must also be configured in Supabase. `VITE_API_URL` is the API origin **without `/api`**—the client appends that prefix. Leave it empty locally to use Vite's proxy.

### API Worker variables and binding

```text
SUPABASE_URL
APP_ORIGIN
APP_ORIGINS
PUBLIC_API_URL
FILES_BUCKET
```

`APP_ORIGIN` and the comma-separated `APP_ORIGINS` define allowed frontend origins. `PUBLIC_API_URL` is the API origin without `/api`, used to generate image URLs. `FILES_BUCKET` is an R2 binding, not a credential; the current configuration binds it to the private `voxelvault-private` bucket.

### API Worker secrets

```text
SUPABASE_SERVICE_ROLE_KEY
IMAGE_SIGNING_SECRET
```

Use an uncommitted Wrangler `.dev.vars` file for local development secrets and Cloudflare/Wrangler secrets for production. Do not paste secret values into commands committed to the repository, frontend build variables or public documentation.

## Production Deployment

The frontend is built from GitHub and deployed by Cloudflare using [wrangler.frontend.jsonc](voxelvault/wrangler.frontend.jsonc). Its asset directory is the Vite build output, with single-page application routing enabled.

The normal frontend workflow is local verification, `npm run build`, then commit and push for Cloudflare's connected build. Run project commands from `voxelvault/`.

Check the Cloudflare build and deployment result after pushing; a Git push alone does not confirm that the live site was updated. If the connected build fails or does not trigger, use the verified manual frontend fallback from `voxelvault/`, with the intended production frontend environment variables available at build time:

```sh
npm run build
npx wrangler deploy --config wrangler.frontend.jsonc
```

The API is deployed independently using [wrangler.jsonc](voxelvault/wrangler.jsonc). Configure the intended account, R2 binding, allowed origins and secrets before deployment:

```sh
npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY
npx wrangler secret put IMAGE_SIGNING_SECRET
npm run worker:deploy
```

Review and apply any required new Supabase migrations **before** deploying Worker code that depends on them. Worker deployment does not apply database migrations. The configured cron runs cleanup hourly.

Frontend-only changes do not require an API deployment; API-only changes do not require rebuilding the frontend unless their client contract changes.

## Security & Privacy

Published galleries are public. Drafts and private attachments are owner-only, with authorization enforced by the API. Private R2 object URLs are not exposed. Backend credentials belong in Worker secrets, never browser-visible configuration.

## Status

VoxelVault is deployed on Cloudflare with the Worker API as its production backend. Ongoing refinements focus on browsing, mobile interaction and recovery flows; touch behavior still needs physical-device verification alongside local checks.

## Credits & Attribution

Images and builds belong to their respective creators. Posts support original-creator credits, source links and external downloads so attribution can stay with each creation. Refer to the original source for any usage or redistribution terms.

**[Explore the live site →](https://voxelvault.2002trungtin.workers.dev/)**
