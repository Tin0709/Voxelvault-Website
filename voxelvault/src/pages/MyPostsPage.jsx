import { useState } from "react";
import { Link } from "react-router";
import { creations } from "../data/creations";

function normalizeText(value) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[đĐ]/g, "d")
    .toLowerCase();
}

function MyPostsPage() {
  const [query, setQuery] = useState("");

  const terms = normalizeText(query).trim().split(/\s+/).filter(Boolean);

  const filteredPosts = creations.filter((creation) => {
    const text = normalizeText(`${creation.title} ${creation.category}`);

    return terms.every((term) => text.includes(term));
  });

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

      <p className="mt-6 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-on-surface-variant">
        Demo collection — showing sample posts while accounts and saving are
        being built.
      </p>

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
          <h2 className="font-headline-lg text-xl">No posts found</h2>

          <p className="mt-3 text-sm text-on-surface-variant">
            Try another title or category.
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
    </main>
  );
}

export default MyPostsPage;
