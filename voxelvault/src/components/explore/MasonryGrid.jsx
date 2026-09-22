import CreationCard from "./CreationCard";

function MasonryGrid({ creations, onCreationClick }) {
  if (creations.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-white/15 px-6 py-16 text-center">
        <h2 className="text-lg font-semibold">No matching creations</h2>

        <p className="mt-2 text-sm text-on-surface-variant">
          Try a different keyword or choose another category.
        </p>
      </div>
    );
  }

  return (
    <div className="columns-1 gap-6 sm:columns-2 lg:columns-3 xl:columns-4">
      {creations.map((creation, index) => (
        <div key={creation.id} className="vault-card-enter mb-8 break-inside-avoid" style={{animationDelay:`${Math.min(index % 50, 8)*45}ms`}}>
          <CreationCard creation={creation} onOpen={onCreationClick} />
        </div>
      ))}
    </div>
  );
}

export default MasonryGrid;
