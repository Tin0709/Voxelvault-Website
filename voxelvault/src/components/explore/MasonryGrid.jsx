import CreationCard from "./CreationCard";

function MasonryGrid({ creations }) {
  if (creations.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-white/15 px-6 py-16 text-center">
        <h2 className="text-lg font-semibold">No builds here yet</h2>

        <p className="mt-2 text-sm text-on-surface-variant">
          Try another category to discover more creations.
        </p>
      </div>
    );
  }

  return (
    <div className="columns-1 gap-6 sm:columns-2 lg:columns-3 xl:columns-4">
      {creations.map((creation) => (
        <div key={creation.id} className="mb-8 break-inside-avoid">
          <CreationCard creation={creation} />
        </div>
      ))}
    </div>
  );
}

export default MasonryGrid;
