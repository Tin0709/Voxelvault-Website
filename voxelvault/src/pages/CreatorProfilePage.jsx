import VaultLoader from '../components/ui/VaultLoader';
import { useAuth } from '../auth/AuthContext';
import Icon from '../components/ui/Icon';
import { notify } from '../lib/notifications';
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import MasonryGrid from "../components/explore/MasonryGrid";
import { useApi } from "../lib/useApi";
import { usePostList } from "../lib/usePostList";
import RequestState from "../components/ui/RequestState";

function CreatorProfilePage({ own = false }) {
  const { user } = useAuth();
  const params=useParams();
  const creatorId=own?user?.id:params.creatorId;
  const [category,setCategory]=useState('all');
  const navigate = useNavigate();

  const { data: creator, loading, error } = useApi(`/profiles/${encodeURIComponent(creatorId)}`);
  const posts = usePostList(`/posts?creator=${encodeURIComponent(creatorId)}`);
  const creations = posts.data?.posts ?? [];

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [creatorId]);

  if (loading || error || posts.loading || posts.error) return <RequestState loading={loading || posts.loading} error={error || posts.error} />;
  if (!creator) {
    return (
      <main className="mx-auto w-full max-w-[1600px] flex-1 px-6 py-20 lg:px-10">
        <h1 className="font-headline-lg text-3xl">Creator not found</h1>

        <p className="mt-3 text-on-surface-variant">
          This profile is unavailable or the link is incorrect.
        </p>

        <Link to="/explore" className="mt-6 inline-block text-primary hover:underline">
          ← Back to Explore
        </Link>
      </main>
    );
  }

  const creatorPosts = creations.filter(
    (creation) => creation.creatorId === creator.id,
  );

  return (
    <main className="vault-page-enter mx-auto w-full max-w-[1600px] flex-1 px-6 pb-16 pt-8 lg:px-10">
      <Link
        to="/explore"
        className="text-sm text-on-surface-variant hover:text-primary"
      >
        ← Back to Explore
      </Link>

      <section
        aria-labelledby="creator-name"
        className="mt-6 overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03]"
      >
        <div aria-hidden="true" className="relative h-48 bg-gradient-to-br from-primary/20 via-primary/5 to-transparent sm:h-80">
          {creator.coverUrl&&<img src={creator.coverUrl} alt="" className="h-full w-full object-cover"/>}
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/10 to-transparent"/>
        </div>

        <div className="px-6 pb-8 sm:px-8">
          <div className="relative -mt-16 flex flex-wrap items-end justify-between gap-5">
            <div
              aria-hidden="true"
              className="flex h-32 w-32 items-center justify-center rounded-3xl border-4 border-background bg-primary text-3xl font-semibold text-on-primary"
            >
              {creator.avatarUrl ? <img src={creator.avatarUrl} alt="" className="h-full w-full rounded-2xl object-cover" /> : creator.initials}
            </div>

            <div className="flex flex-wrap items-center gap-3">{user?.id===creatorId&&<Link to="/my-posts" className="inline-flex items-center gap-2 rounded-full border border-primary/30 px-5 py-3 text-sm text-primary"><Icon name="archive"/>My Posts & storage</Link>}{user?.id===creatorId&&<Link to="/profile/edit" className="vault-action inline-flex items-center gap-2 rounded-full bg-primary px-5 py-3 text-sm text-on-primary"><Icon name="edit"/>Edit profile</Link>}<button type="button" onClick={async()=>{try{await navigator.clipboard.writeText(window.location.origin+'/creators/'+creatorId);notify('Profile link copied.');}catch{notify('Copy the profile URL from your address bar.','info');}}} className="inline-flex items-center gap-2 rounded-full border border-white/15 px-5 py-3 text-sm"><Icon name="link"/>Share profile</button><span className="rounded-full border border-white/10 px-4 py-2 text-sm">
              {creatorPosts.length}{" "}
              {creatorPosts.length === 1 ? "creation" : "creations"}
            </span></div>
          </div>

          <h1
            id="creator-name"
            className="mt-5 break-words font-headline-lg text-3xl sm:text-4xl"
          >
            {creator.name}
          </h1>

          <p className="mt-2 text-sm text-primary">@{creator.handle}</p>
          {creator.country&&<p className="mt-3 flex items-center gap-2 text-sm text-on-surface-variant"><Icon name="globe"/>{new Intl.DisplayNames(['en'],{type:'region'}).of(creator.country)}</p>}

          <p className="mt-5 max-w-2xl whitespace-pre-line text-sm leading-relaxed text-on-surface-variant">
            {creator.bio}
          </p>

          {creator.isDemo && (
            <p className="mt-5 rounded-xl border border-white/10 bg-background/50 px-4 py-3 text-xs leading-relaxed text-on-surface-variant">
              Demo profile. Post assignments are for UI testing and do not
              identify the original creators.
            </p>
          )}
        </div>
      </section>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <div className="vault-panel p-5"><p className="vault-eyebrow"><Icon name="grid"/>Public creations</p><p className="mt-3 text-2xl">{creatorPosts.length}{posts.data?.hasMore?'+':''}</p></div>
        <div className="vault-panel p-5"><p className="vault-eyebrow"><Icon name="cube"/>Creative collections</p><p className="mt-3 text-2xl">{new Set(creatorPosts.map(p=>p.category)).size}{posts.data?.hasMore?'+':''}</p></div>
        <div className="vault-panel p-5"><p className="vault-eyebrow"><Icon name="lock"/>Personal vault</p><p className="mt-3 text-sm text-on-surface-variant">Public images. Owner-only files.</p></div>
      </div>

      <section aria-labelledby="creator-posts-heading" className="mt-10">
        <div className="mb-6 border-b border-white/10 pb-4">
          <h2 id="creator-posts-heading" className="font-headline-lg text-2xl">
            <Icon name="grid" className="mr-2 text-primary"/>Portfolio & creations
          </h2>
        </div>

        <div className="mb-6 flex flex-wrap gap-2" role="group" aria-label="Filter portfolio">{['all',...new Set(creatorPosts.map(p=>p.category))].map(c=><button type="button" key={c} aria-pressed={category===c} onClick={()=>setCategory(c)} className={category===c?'rounded-full bg-primary px-4 py-2 text-sm text-on-primary':'rounded-full bg-white/5 px-4 py-2 text-sm text-on-surface-variant'}>{c==='all'?'All creations':c}</button>)}</div>
        {creatorPosts.length > 0 ? (
          <MasonryGrid
            creations={creatorPosts.filter(p=>category==='all'||p.category===category)}
            onCreationClick={(creation) =>
              navigate(`/creations/${encodeURIComponent(creation.id)}`)
            }
          />
        ) : (
          <div className="rounded-2xl border border-dashed border-white/15 px-6 py-16 text-center">
            <h3 className="text-lg font-medium">No creations yet</h3>

            <p className="mt-2 text-sm text-on-surface-variant">
              This creator has not shared any posts yet.
            </p>
          </div>
        )}
      </section>
      {posts.data?.hasMore && <button type="button" disabled={posts.loadingMore} onClick={posts.loadMore} className="mt-8 rounded-full border border-primary/40 px-6 py-3 text-primary">{posts.loadingMore ? <span className="inline-flex items-center gap-2"><VaultLoader compact/>Loading…</span> : 'Load more posts'}</button>}
    </main>
  );
}

export default CreatorProfilePage;
