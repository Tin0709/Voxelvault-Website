import StorageUsage from '../components/ui/StorageUsage';
import VaultLoader from '../components/ui/VaultLoader';
import { useEffect, useState } from "react";
import { Link } from "react-router";

import { usePostList } from "../lib/usePostList";
import RequestState from "../components/ui/RequestState";
import { useAuth } from '../auth/AuthContext';
import { listDrafts,deleteDraft } from '../lib/drafts';
import { confirmAction } from '../lib/confirm';
import { notify } from '../lib/notifications';
import Icon from '../components/ui/Icon';

function normalizeText(value) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[đĐ]/g, "d")
    .toLowerCase();
}

function MyPostsPage() {
  const {user}=useAuth();
  const [drafts,setDrafts]=useState([]);
  const [draftError,setDraftError]=useState('');
  useEffect(()=>{let active=true;listDrafts(user.id).then(rows=>{if(active)setDrafts(rows);}).catch(()=>{if(active)setDraftError('Local drafts could not be loaded. Browser storage may be unavailable.');});return()=>{active=false;};},[user.id]);
  const [query, setQuery] = useState("");
  const { data, loading, error, loadingMore, loadMore } = usePostList('/posts?mine=true');

  const creations = data?.posts ?? [];

  const terms = normalizeText(query).trim().split(/\s+/).filter(Boolean);

  const filteredPosts = creations.filter((creation) => {
    const text = normalizeText(`${creation.title} ${creation.category}`);

    return terms.every((term) => text.includes(term));
  });

  if (loading || error) return <RequestState loading={loading} error={error} />;
  return (
    <main className="mx-auto w-full max-w-[1600px] flex-1 px-6 py-10 lg:px-10">
      <div className="flex flex-wrap items-start justify-between gap-5">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-primary">
            VoxelVault Studio
          </p>

          <h1 className="mt-3 font-headline-lg text-3xl sm:text-4xl">
            My posts
          </h1>

          <p className="mt-3 text-sm text-on-surface-variant">
            Browse your creations and continue editing.
          </p>
        </div>

        <Link
          to="/create"
          className="rounded-full bg-primary px-5 py-3 text-sm font-medium text-on-primary transition hover:opacity-90"
        >
          + Create post
        </Link>
      </div>

      <StorageUsage />

      {draftError&&<p role="alert" className="mt-5 text-amber-200">{draftError}</p>}
      {drafts.length>0&&<section className="mt-8" aria-label="Unfinished drafts"><h2 className="flex items-center gap-2 text-xl text-amber-200"><Icon name="edit"/>Continue where you left off</h2><p className="mt-2 text-xs text-on-surface-variant">Private drafts saved on this browser, including your selected files. They are not published or synced to other devices.</p><div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{drafts.map(row=><article key={row.id} className="rounded-2xl border border-amber-400/25 bg-amber-900/15 p-5"><p className="flex items-center gap-2 text-xs uppercase tracking-wider text-amber-300"><Icon name="edit"/>Unfinished {row.mode==='edit'?'edit':'post'}</p><h3 className="mt-3 break-words text-xl">{row.draft.title||'Untitled draft'}</h3><p className="mt-2 text-xs text-on-surface-variant">{row.draft.gallery?.length||0} images · {row.draft.attachments?.length||0} files · {new Date(row.updatedAt).toLocaleString()}</p><div className="mt-5 flex gap-3"><Link to={`/drafts/${row.draftId}`} className="rounded-full bg-amber-200 px-4 py-2 text-sm text-black">Continue editing</Link><button type="button" aria-label={`Delete draft ${row.draft.title||'Untitled draft'}`} onClick={async()=>{if(!await confirmAction('Delete this local draft and its selected files? Published posts are not affected.','Delete draft'))return;try{await deleteDraft(user.id,row.draftId);setDrafts(items=>items.filter(item=>item.id!==row.id));notify('Draft deleted.');}catch{notify('Draft could not be deleted.','error');}}} className="rounded-full border border-amber-300/20 px-3 text-amber-200"><Icon name="trash"/></button></div></article>)}</div></section>}

      <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="w-full sm:max-w-md">
          <label
            htmlFor="my-posts-search"
            className="text-sm text-on-surface-variant"
          >
            Search this collection
          </label>

          <input
            id="my-posts-search"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by title or category..."
            className="mt-2 w-full rounded-full border border-white/10 bg-white/5 px-5 py-3 text-sm outline-none transition placeholder:text-on-surface-variant focus:border-primary focus:ring-2 focus:ring-primary/15"
          />
        </div>

        <p
          role="status"
          aria-atomic="true"
          className="text-sm text-on-surface-variant"
        >
          {filteredPosts.length} {filteredPosts.length === 1 ? "post" : "posts"}
        </p>
      </div>

      {filteredPosts.length > 0 ? (
        <div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          {filteredPosts.map((creation) => {
            const detailUrl = `/creations/${encodeURIComponent(creation.id)}`;

            return (
              <article
                key={creation.id}
                className="flex min-w-0 flex-col overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03]"
              >
                <Link
                  to={detailUrl}
                  aria-label={`View ${creation.title}`}
                  className="group block overflow-hidden bg-black/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
                >
                  <img
                    src={creation.image}
                    alt={creation.alt}
                    loading="lazy"
                    className="aspect-video w-full object-cover transition-transform duration-300 motion-safe:group-hover:scale-[1.03]"
                  />
                </Link>

                <div className="flex flex-1 flex-col p-5">
                  <p className="text-xs capitalize text-primary">
                    {creation.category}
                  </p>

                  <h2 className="mt-2 break-words font-headline-lg text-xl">
                    <Link
                      to={detailUrl}
                      className="transition hover:text-primary"
                    >
                      {creation.title}
                    </Link>
                  </h2>

                  <p className="mt-3 text-xs text-on-surface-variant">
                    {creation.gallery?.length ?? 1} images
                    {" · "}
                    {creation.attachments?.length ?? 0} private attachments
                  </p>

                  <div className="mt-auto flex flex-wrap gap-3 pt-6">
                    <Link
                      to={detailUrl}
                      className="rounded-full border border-white/15 px-4 py-2 text-sm transition hover:bg-white/5"
                    >
                      View post
                    </Link>

                    <Link
                      to={`${detailUrl}/edit`}
                      className="rounded-full bg-primary/10 px-4 py-2 text-sm text-primary transition hover:bg-primary/20"
                    >
                      Edit post
                    </Link>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="mt-6 rounded-2xl border border-dashed border-white/15 px-6 py-16 text-center">
          <h2 className="font-headline-lg text-xl">{creations.length ? 'No posts found' : drafts.length ? 'No published posts yet' : 'Create your first post'}</h2>

          <p className="mt-3 text-sm text-on-surface-variant">
            {creations.length ? 'Try another title or category.' : 'Your account is empty. Add public images, source credit and your private files.'}
          </p>

          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="mt-5 rounded-full bg-primary/10 px-5 py-2.5 text-sm text-primary hover:bg-primary/20"
            >
              Clear search
            </button>
          )}
        </div>
      )}
      {data?.hasMore && <button type="button" disabled={loadingMore} onClick={loadMore} className="mt-8 rounded-full border border-primary/40 px-6 py-3 text-primary">{loadingMore ? <span className="inline-flex items-center gap-2"><VaultLoader compact/>Loading…</span> : 'Load more posts'}</button>}
    </main>
  );
}

export default MyPostsPage;
