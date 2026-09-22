import { useEffect } from "react";
import { Link, useNavigate, useParams } from "react-router";
import MasonryGrid from "../components/explore/MasonryGrid";
import { useApi } from "../lib/useApi";
import RequestState from "../components/ui/RequestState";

function CreatorProfilePage() {
  const { creatorId } = useParams();
  const navigate = useNavigate();

  const { data: creator, loading, error } = useApi(`/profiles/${encodeURIComponent(creatorId)}`);
  const posts = useApi(`/posts?creator=${encodeURIComponent(creatorId)}`);
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

        <Link to="/" className="mt-6 inline-block text-primary hover:underline">
          ← Back to Explore
        </Link>
      </main>
    );
  }

  const creatorPosts = creations.filter(
    (creation) => creation.creatorId === creator.id,
  );

  return (
    <main className="mx-auto w-full max-w-[1600px] flex-1 px-6 pb-16 pt-8 lg:px-10">
      <Link
        to="/"
        className="text-sm text-on-surface-variant hover:text-primary"
      >
        ← Back to Explore
      </Link>

      <section
        aria-labelledby="creator-name"
        className="mt-6 overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03]"
      >
        <div
          aria-hidden="true"
          className="h-28 bg-gradient-to-br from-primary/20 via-primary/5 to-transparent sm:h-40"
        />

        <div className="px-6 pb-8 sm:px-8">
          <div className="-mt-10 flex flex-wrap items-end justify-between gap-5">
            <div
              aria-hidden="true"
              className="flex h-24 w-24 items-center justify-center rounded-3xl border-4 border-background bg-primary text-3xl font-semibold text-on-primary"
            >
              {creator.initials}
            </div>

            <span className="rounded-full border border-white/10 bg-background px-4 py-2 text-sm text-on-surface-variant">
              {creatorPosts.length}{" "}
              {creatorPosts.length === 1 ? "creation" : "creations"}
            </span>
          </div>

          <h1
            id="creator-name"
            className="mt-5 break-words font-headline-lg text-3xl sm:text-4xl"
          >
            {creator.name}
          </h1>

          <p className="mt-2 text-sm text-primary">@{creator.handle}</p>

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

      <section aria-labelledby="creator-posts-heading" className="mt-10">
        <div className="mb-6 border-b border-white/10 pb-4">
          <h2 id="creator-posts-heading" className="font-headline-lg text-2xl">
            Creations
          </h2>
        </div>

        {creatorPosts.length > 0 ? (
          <MasonryGrid
            creations={creatorPosts}
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
    </main>
  );
}

export default CreatorProfilePage;
