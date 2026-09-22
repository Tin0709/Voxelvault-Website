const categories = [
  { id: "all", label: "All builds" },
  { id: "architecture", label: "Architecture" },
  { id: "landscapes", label: "Landscapes" },
  { id: "survival", label: "Survival" },
  { id: "fantasy", label: "Fantasy" },
  { id: "redstone", label: "Redstone" },
];

function FilterBar({ activeCategory, onCategoryChange, customCategories = [] }) {
  const options = [...categories, ...customCategories.filter(id=>!categories.some(c=>c.id===id)).map(id=>({id,label:id}))];
  return (
    <section
      aria-label="Filter creations"
      className="border-b border-white/10 pb-6"
    >
      <div
        role="group"
        aria-label="Build categories"
        className="flex flex-wrap gap-2 sm:gap-3"
      >
        {options.map((category) => {
          const isActive = activeCategory === category.id;

          return (
            <button
              key={category.id}
              type="button"
              aria-pressed={isActive}
              onClick={() => onCategoryChange(category.id)}
              className={`
                rounded-full border px-5 py-2.5
                text-sm font-medium transition-colors
                focus-visible:outline-none
                focus-visible:ring-2 focus-visible:ring-primary
                focus-visible:ring-offset-2
                focus-visible:ring-offset-background
                ${
                  isActive
                    ? "border-primary bg-primary text-on-primary"
                    : "border-white/10 bg-white/[0.03] text-on-surface-variant hover:border-white/25 hover:bg-white/[0.07] hover:text-on-surface"
                }
              `}
            >
              {category.label}
            </button>
          );
        })}
      </div>
    </section>
  );
}

export default FilterBar;
