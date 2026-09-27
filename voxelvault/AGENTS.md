# VoxelVault

React/Vite frontend + Node API, using Supabase Auth/Postgres/Storage and Cloudflare R2.

## Work efficiently

Read only files required for the current task. Do not scan the whole repository.

Do not inspect unless specifically needed:

- node_modules/
- dist/
- .env\*
- package-lock.json
- binary/image assets
- unrelated tests or docs

Search for the relevant component, route, function, or CSS class first, then open only direct dependencies.

## Project map

- Routing/app shell: `src/App.jsx`
- Pages: `src/pages/`
- Shared UI: `src/components/`
- Explore: `src/pages/ExplorePage.jsx`, `src/components/explore/`, `src/lib/useImageFeed.js`
- Create/Edit posts: `src/components/post/PostEditor.jsx`, `src/components/post/`
- Post details: `src/pages/PostDetailPage.jsx`
- Client API: `src/lib/api.js`, `src/lib/useApi.js`
- Auth: `src/auth/`, `src/lib/supabase.js`
- Backend/API: `server/app.js`
- Validation/storage rules: `server/validation.js`
- Global styling: `src/index.css`, `src/App.css`, `src/components/ui/animations.css`

Use `docs/PRODUCT_DIRECTION.md` only when changing uploads, storage, privacy, ownership, schema, or core product behavior.

Use `docs/BACKEND_SETUP.md` only for backend/provider setup.

Use `docs/DEPLOY.md` only for deployment tasks.

## Change policy

Make the smallest correct change.

Do not refactor unrelated code, rename unrelated files, change formatting globally, or modify generated files.

Preserve existing architecture and visual style unless the task explicitly asks otherwise.

Preserve security rules: private attachments remain owner-only and secrets/private download URLs must never become public.

## Verification

Use the smallest verification relevant to the changed code.

Do not automatically run the entire test suite, full lint, live-backend tests, production tests, or repeated builds unless the change requires them.

Never run live/production tests unless explicitly requested.

After finishing, report only:

1. files changed,
2. what changed,
3. verification performed.
