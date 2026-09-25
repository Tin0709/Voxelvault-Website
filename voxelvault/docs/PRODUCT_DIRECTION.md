# VoxelVault

## Product contract

VoxelVault stores personal content with a public image showcase. It supports Minecraft
worlds, models, design work, documents and other content.

- Posts, showcase images and optional source credit are public.
- Attachments belong to the posting account. Only that account may download them.
- Directly selected files, including images, are limited to 50 MB each (50,000,000
  bytes, inclusive). Oversized files are rejected before reading or upload.
- Larger files stay on an external host such as Google Drive or MEGA. Optional
  `externalDownloads` entries contain an id, name and URL, separately from public
  `creditUrl` (the original post). Users may combine files and external links.
- External download URLs are owner-only data in VoxelVault, but destination access
  is controlled by the external provider. VoxelVault cannot revoke a copied public
  sharing link. Do not include these URLs in public post API responses.
- `ownerId` identifies the posting account; `originalCreator`, `originalSource` and
  `creditUrl` describe the original work independently. Credit never grants permissions.
- A new account has zero posts, zero files and zero used bytes. Production data must
  never fall back to development fixtures.
- The current Explore design is the visual reference for other pages.

## Current implementation

React / Vite / Tailwind frontend now calls Supabase Auth and a Node API. The schema,
RLS policies, upload/download paths and CRUD are implemented locally. Cloud connection
and provider integration tests require the owner's Supabase/R2/OAuth credentials;
follow BACKEND_SETUP.md. Static development fixtures are no longer imported by pages.

Create/Edit separates public images, optional public credit and private file selection.
Each selected attachment holds a local File, originalName, mimeType, extension,
typeLabel, exact sizeBytes and status `selected`. Selection is not upload success.
File metadata is browser supplied and must be verified by the backend later.
Sizes display with decimal units (1 KB = 1,000 bytes). ZIP means archive, not world.
No file contents are read into memory for attachment metadata or exposed as public URLs.
The preview includes an explicitly private owner summary, not a public download list.
Publish/Save uploads selected files and saves the post transactionally. Public images
use Supabase; attachments at most 5 MB use private Supabase, larger attachments up to
50 MB use private R2 Standard. Quota defaults to 250 MB/account and counts reservations.
Leaving or refreshing before saving discards the draft; abandoned objects are eligible
for cleanup after 24 hours. A scheduled cleanup command must be installed on deployment.

The fixture's legacy creatorId/creator fields currently represent the demo poster;
they are not proof of authorship or an authenticated identity.

## Next stages

1. Complete UI flows, mobile verification, unsaved-draft handling, empty/error states
   and a shared category model for content beyond Minecraft.
2. Connect Supabase Auth and session-aware personal routes.
3. Implement profiles, posts, post_images, attachments and upload_sessions in PostgreSQL.
4. Add genuine uploads with per-file progress, failure, retry and cancellation;
   enforce the 50,000,000-byte per-file limit at upload authorization and completion.
   Large files use external URLs, with no automatic import or download by VoxelVault.
   Never simulate successful uploads in production.
5. Enforce owner-only download/update/delete in the backend; keep attachment objects
   private. Reserve quota atomically for concurrent uploads, verify actual stored bytes,
   and clean up abandoned uploads and objects from failed saves/deletions.
6. Test and deploy the complete account/create/reload/download/edit/delete flow,
   including direct API access attempts from a second account and quota reconciliation.

Storage direction: Supabase for images and small attachments, Cloudflare R2 Standard
for attachments over 5 MB. Recheck actual provider terms; no promise of perpetual
free capacity or hundreds of GB. Provider allowance is shared across the website.

## Completion criteria

A new empty account can create a post with images, credit and multiple files;
successful persistence is confirmed, content survives reload and appears in Explore
and My Posts. The owner can download, edit and delete. Another account can view the
showcase but cannot access attachments even through direct API requests. Deletion
updates storage usage correctly.
