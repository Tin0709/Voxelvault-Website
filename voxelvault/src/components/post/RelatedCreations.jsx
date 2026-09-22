import { useNavigate } from "react-router";
import CreationCard from "../explore/CreationCard";
import { useApi } from "../../lib/useApi";

function RelatedCreations({ creation }) {
  const navigate = useNavigate();
  const { data } = useApi('/posts');
  const creations = data?.posts ?? [];

  const relatedCreations = creations
    .filter(
      (item) => item.id !== creation.id && item.category === creation.category,
    )
    .slice(0, 4);

  if (relatedCreations.length === 0) {
    return null;
  }

  function openCreation(item) {
    navigate(`/creations/${encodeURIComponent(item.id)}`);
  }

  return (
    <section
      aria-labelledby="related-creations-heading"
      className="mt-14 border-t border-white/10 pt-10"
    >
      <p className="text-xs uppercase tracking-[0.2em] text-primary">
        Keep exploring
      </p>

      <h2
        id="related-creations-heading"
        className="mt-3 font-headline-lg text-2xl tracking-tight sm:text-3xl"
      >
        More in {creation.category}
      </h2>

      <p className="mt-3 text-sm text-on-surface-variant">
        Discover more creations from the same category.
      </p>

      <div className="mt-7 grid grid-cols-1 items-start gap-6 sm:grid-cols-2 xl:grid-cols-4">
        {relatedCreations.map((item) => (
          <CreationCard key={item.id} creation={item} onOpen={openCreation} />
        ))}
      </div>
    </section>
  );
}

export default RelatedCreations;
