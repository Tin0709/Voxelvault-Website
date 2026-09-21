import { useEffect, useState } from "react";
import { Link, useParams } from "react-router";
import PostGallery from "../components/post/PostGallery";
import { creations } from "../data/creations";
import RelatedCreations from "../components/post/RelatedCreations";
import PostDownloads from "../components/post/PostDownloads";

function PostDetailPage() {
  const { id } = useParams();
  const [shareMessage, setShareMessage] = useState("");

  const creation = creations.find((item) => item.id === id);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
    setShareMessage("");
  }, [id]);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setShareMessage("Link copied!");
    } catch {
      setShareMessage("Please copy the link from your address bar.");
    }
  }

  if (!creation) {
    return (
      <main className="mx-auto w-full max-w-[1600px] flex-1 px-6 py-20 lg:px-10">
        <h1 className="font-headline-lg text-3xl">Creation not found</h1>

        <p className="mt-3 text-on-surface-variant">
          This link may be incorrect or the creation may have been removed.
        </p>

        <Link to="/" className="mt-6 inline-block text-primary">
          ← Back to Explore
        </Link>
      </main>
    );
  }

  const specifications = [
    ["Collection", creation.location],
    ["Minecraft version", creation.minecraftVersion],
  ].filter(([, value]) => Boolean(value));

  return (
    <main className="mx-auto w-full max-w-[1600px] flex-1 px-6 pb-16 lg:px-10">
      <div className="flex flex-wrap items-center justify-between gap-4 py-6">
        <nav
          aria-label="Breadcrumb"
          className="flex min-w-0 items-center gap-3 text-sm"
        >
          <Link
            to="/"
            className="shrink-0 text-on-surface-variant hover:text-primary"
          >
            ← Explore
          </Link>

          <span aria-hidden="true" className="text-white/25">
            /
          </span>

          <span className="capitalize text-on-surface">
            {creation.category}
          </span>
        </nav>

        <div className="flex flex-wrap items-center gap-3">
          <span role="status" className="text-xs text-on-surface-variant">
            {shareMessage}
          </span>

          <button
            type="button"
            onClick={copyLink}
            className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm transition hover:bg-white/10"
          >
            Copy link ↗
          </button>
          <Link
            to={`/creations/${encodeURIComponent(creation.id)}/edit`}
            className="rounded-full bg-primary px-4 py-2 text-sm font-medium text-on-primary transition hover:opacity-90"
          >
            Edit post
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
        <div className="min-w-0 space-y-6 lg:col-span-7 xl:col-span-8">
          <PostGallery key={creation.id} creation={creation} />

          <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 sm:p-8">
            <p className="text-xs uppercase tracking-[0.2em] text-primary">
              Behind the build
            </p>

            <h2 className="mt-3 font-headline-lg text-2xl">
              About this creation
            </h2>

            <p className="mt-4 whitespace-pre-line text-sm leading-relaxed text-on-surface-variant">
              {creation.description ||
                "The creator has not added a description yet."}
            </p>
          </section>
        </div>

        <aside
          aria-label="Creation information"
          className="min-w-0 space-y-5 lg:col-span-5 xl:col-span-4"
        >
          <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
            <p className="text-xs uppercase tracking-[0.2em] text-primary">
              Creation archive
            </p>

            <h1 className="mt-4 break-words font-headline-lg text-3xl leading-tight tracking-tight">
              {creation.title}
            </h1>

            <div className="mt-6 flex items-center gap-3 rounded-xl bg-white/5 p-4">
              <span
                aria-hidden="true"
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/15 font-semibold text-primary"
              >
                {creation.creator.slice(0, 1).toUpperCase()}
              </span>

              <div className="min-w-0">
                <p className="text-xs text-on-surface-variant">Created by</p>
                <p className="break-words text-sm font-medium">
                  {creation.creator}
                </p>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
            <h2 className="font-headline-lg text-xl">World & files</h2>

            <dl className="mt-5 space-y-4">
              {specifications.map(([label, value]) => (
                <div key={label} className="flex justify-between gap-4 text-sm">
                  <dt className="text-on-surface-variant">{label}</dt>
                  <dd className="min-w-0 break-words text-right">{value}</dd>
                </div>
              ))}
            </dl>

            <div className="mt-6 border-t border-white/10 pt-6">
              <PostDownloads downloads={creation.downloads} />
            </div>
          </section>
        </aside>
      </div>
      <RelatedCreations creation={creation} />
    </main>
  );
}

export default PostDetailPage;
