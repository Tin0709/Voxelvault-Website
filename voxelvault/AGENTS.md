# VoxelVault

VoxelVault is a React/Vite image showcase and downloadable-content platform.

Production architecture:

- Frontend: React + Vite, deployed to Cloudflare Workers Static Assets.
- Production API: Cloudflare Worker at `server/worker.js`.
- Auth / PostgreSQL / small private files: Supabase.
- Large/private storage and all images: Cloudflare R2.
- Legacy Node backend remains in `server/app.js` for historical behavior/reference only.

## Work efficiently

Read only files required for the current task.

Do NOT scan the whole repository.

Search for the exact:

- visible UI string,
- component,
- route,
- function,
- CSS class,
- API path

before opening files.

Open only direct dependencies when necessary.

Do not inspect unless specifically needed:

- `node_modules/`
- `dist/`
- `.wrangler/`
- `.env`
- `.env.local`
- `.env.server.local`
- `.env.worker.production`
- binary/image assets
- unrelated tests
- unrelated docs
- historical migrations

`package-lock.json` should only be inspected/changed when package dependencies
actually change.

Never read secret values.

## Source-of-truth hierarchy

For production backend behavior:

1. `server/worker.js`
2. directly used Worker helpers
3. current Supabase migration/RPC definitions

`server/app.js` is a LEGACY Node backend.

Do not modify `server/app.js` for production Worker tasks unless explicitly
requested.

It may be inspected only when necessary to preserve an older API contract that
has not yet been documented elsewhere.

For frontend behavior:

- use the current React components and `src/lib/api.js`;
- do not infer production behavior from old docs if current code differs.

## Project map

### App / routing

- App shell / routes: `src/App.jsx`
- Pages: `src/pages/`

### Home

- Page: `src/pages/HomePage.jsx`
- Showcase/carousel: `src/components/home/ShowcaseDeck.jsx`
- Latest creations: `src/components/home/LatestCreations.jsx`

### Explore

- Page: `src/pages/ExplorePage.jsx`
- Grid/cards: `src/components/explore/`
- Feed/data: `src/lib/useImageFeed.js`

### Profile

- Creator profile: `src/pages/CreatorProfilePage.jsx`
- Profile basics/editing: `src/pages/ProfileBasicsPage.jsx`

### Create / edit posts

- Create: `src/pages/CreatePostPage.jsx`
- Edit: `src/pages/EditPostPage.jsx`
- Main editor: `src/components/post/PostEditor.jsx`
- Image/media editor: `src/components/post/PostMediaEditor.jsx`
- Attachments: `src/components/post/PostAttachmentsEditor.jsx`
- External downloads: `src/components/post/ExternalDownloadsEditor.jsx`

### Post details / downloads

- Page: `src/pages/PostDetailPage.jsx`
- Gallery: `src/components/post/PostGallery.jsx`
- Downloads: `src/components/post/PostDownloads.jsx`

### Drafts

- Draft page: `src/pages/DraftPage.jsx`
- Draft logic: `src/lib/drafts.js`
- Upload cache: `src/lib/uploadCache.js`

### Storage / My Posts

- Page: `src/pages/MyPostsPage.jsx`
- Client cleanup helpers: `src/lib/storageCleanup.js`

### API / auth

- Client API: `src/lib/api.js`
- API hooks: `src/lib/useApi.js`
- Supabase client: `src/lib/supabase.js`
- Auth: `src/auth/`

### Production backend

- Worker API: `server/worker.js`
- Worker ZIP/archive helper: `server/worker-archive.js`
- Validation: `server/validation.js`
- Storage reporting helper: `server/storage-report.js`

### Legacy backend

- `server/app.js`
- `server/index.js`
- `server/archive.js`
- `server/static.js`

Do not modify these for production tasks unless explicitly required.

### Styling

- Global styles: `src/index.css`
- App styles: `src/App.css`
- Animation helpers: `src/components/ui/animations.css`

### Deployment

- Backend Worker config: `wrangler.jsonc`
- Frontend Static Assets config: `wrangler.frontend.jsonc`

## Current storage/product invariants

Preserve these unless the user explicitly asks to change them.

### Account quota

- 1 GB per account
- `1,000,000,000` bytes
- existing usage/reservations count toward this quota

### Upload size

- maximum file size: `50,000,000` bytes

Do not confuse account quota with per-file limit.

### Storage routing

Detected MIME/type and byte size determine storage:

- all images -> Cloudflare R2
- non-image files `< 1,000,000` bytes -> Supabase private Storage
- non-image files `>= 1,000,000` bytes -> Cloudflare R2

R2 binding:

- `FILES_BUCKET`
- bucket: `voxelvault-private`

Never expose private R2 object URLs.

### Post limits

Current post/draft limits include:

- maximum 50 images per post
- maximum 50 attachments where the current validation applies
- maximum 50 external links where the current validation applies

Do not silently lower these limits.

Frontend should reject image counts over the limit before uploading.

### Privacy / ownership

Preserve all existing rules:

- private attachments are owner-only
- drafts are owner-only
- private storage URLs/object keys are never exposed publicly
- authenticated owner ID must come from auth, not trusted client input
- post/profile/draft associations must be checked before deletion
- cleanup must never delete resources still referenced by a valid post,
  profile avatar/cover or valid draft

## Draft/upload behavior

Drafts support cloud persistence plus local fallback.

Preserve:

- version/conflict behavior
- local recovery
- cached-upload reuse only when the upload is still valid
- stale/deleting/missing upload IDs must not be reused
- bounded upload concurrency
- failed publish/save must remain recoverable

Do not clear a draft before publish succeeds.

## Cleanup behavior

Cleanup is bounded and retry-safe.

Preserve:

- `claim_cleanup` bounded behavior
- scheduled cleanup
- manual unused-file deletion
- missing storage object may be treated as already absent only after ownership
  and reference-safety checks
- genuine permission/network/provider failures remain failures

Do not redesign cleanup unless explicitly requested.

## API compatibility

Preserve existing frontend request/response contracts unless the task explicitly
requires an API change.

Before adding a route:

1. inspect `src/lib/api.js`,
2. confirm what the current frontend actually calls,
3. reuse an existing contract when possible.

Avoid inventing duplicate routes.

Avoid N+1 Supabase calls.

Batch related-resource queries where practical.

Cloudflare Worker external subrequests must remain comfortably within Free-plan
limits.

## UI change policy

For UI tasks:

- inspect only the relevant component and direct styles;
- preserve VoxelVault's current dark/mint visual language;
- do not redesign unrelated components;
- preserve responsive behavior;
- prefer existing interaction patterns from another VoxelVault page when the
  user references them.

Do not add neon/glow effects unless explicitly requested.

For visual tasks, run local development and focused layout checks rather than
changing backend code.

## Change policy

Make the smallest correct change.

Do not:

- refactor unrelated code
- rename unrelated files
- globally reformat files
- modify generated files
- change package dependencies unless genuinely necessary
- create database migrations unless persistence/schema/RPC behavior truly
  requires them

Preserve existing architecture unless explicitly asked otherwise.

## Database migrations

Never edit an already-applied migration to change production behavior.

Create a new migration under:

`supabase/migrations/`

when a production DB/RPC change is required.

If a Worker change depends on a new migration:

1. create and verify the migration,
2. tell the user to apply it first,
3. only then deploy the Worker.

Do not apply production migrations automatically unless explicitly requested.

## Verification

Use the smallest verification relevant to the change.

### Frontend/UI changes

Prefer:

- focused local checks
- `npm run dev` for visual review
- `npm run build` before production push

Do not run the full test suite automatically.

### Worker/API changes

Prefer:

- focused mocked/local route checks
- syntax/diff checks
- request-count checks when relevant

Do not use production credentials or production data unless explicitly
requested.

### Database changes

Verify:

- migration logic
- boundary cases
- ownership/security behavior
- compatibility with current Worker calls

Never run production SQL automatically.

## Deployment rules

Do NOT deploy unless explicitly requested.

### Frontend

Frontend production is built from GitHub and deployed by Cloudflare.

Typical workflow:

1. `npm run dev`
2. visually verify UI
3. `npm run build`
4. commit/push
5. Cloudflare builds frontend automatically

Do not manually deploy the frontend unless explicitly requested.

### Backend Worker

Backend deployment command:

`npm run worker:deploy`

Only use it when explicitly requested.

### Production URLs

Frontend:
`https://voxelvault.2002trungtin.workers.dev`

API:
`https://voxelvault-api.2002trungtin.workers.dev`

Local frontend:
`http://localhost:5173`

## Git / secrets

Never commit:

- `.env`
- `.env.local`
- `.env.server.local`
- `.env.worker.production`
- Supabase secret/service-role keys
- `IMAGE_SIGNING_SECRET`
- Cloudflare API tokens
- OAuth client secrets

Public frontend variables such as Supabase project URL / publishable key may
exist in frontend build configuration, but never promote a secret into a
`VITE_*` variable.

## Final response

After completing a coding task, keep the response concise.

Report:

1. files changed
2. what changed
3. focused verification performed
4. whether deployment or a database migration is still required

Do not repeat long implementation details unless requested.
