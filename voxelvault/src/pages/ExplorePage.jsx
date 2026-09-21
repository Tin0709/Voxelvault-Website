import { useState } from "react";
import ExploreHero from "../components/explore/ExploreHero";
import FilterBar from "../components/explore/FilterBar";
import MasonryGrid from "../components/explore/MasonryGrid";
import CreationModal from "../components/explore/CreationModal";
import { creations } from "../data/creations";

function normalizeText(value) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[đĐ]/g, "d")
    .toLowerCase();
}

function ExplorePage({ searchQuery = "" }) {
  const [activeCategory, setActiveCategory] = useState("all");
  const [selectedCreation, setSelectedCreation] = useState(null);

  const searchTerms = normalizeText(searchQuery)
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  const filteredCreations = creations.filter((creation) => {
    const matchesCategory =
      activeCategory === "all" || creation.category === activeCategory;

    const searchableText = normalizeText(
      [
        creation.title,
        creation.creator,
        creation.description,
        creation.category,
        creation.location,
      ]
        .filter(Boolean)
        .join(" "),
    );

    const matchesSearch = searchTerms.every((term) =>
      searchableText.includes(term),
    );

    return matchesCategory && matchesSearch;
  });

  return (
    <main className="mx-auto max-w-[1600px] px-6 pb-16 lg:px-10">
      <ExploreHero />

      <FilterBar
        activeCategory={activeCategory}
        onCategoryChange={setActiveCategory}
      />

      <section aria-label="Creations" className="pt-6">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <p
            role="status"
            aria-atomic="true"
            className="break-words text-sm text-on-surface-variant"
          >
            {filteredCreations.length}{" "}
            {filteredCreations.length === 1 ? "creation" : "creations"}
            {searchQuery.trim() && (
              <>
                {" "}
                matching{" "}
                <span className="font-medium text-on-surface">
                  “{searchQuery.trim()}”
                </span>
              </>
            )}
          </p>

          {activeCategory !== "all" && (
            <button
              type="button"
              onClick={() => setActiveCategory("all")}
              className="rounded-full px-3 py-1 text-sm text-primary transition hover:bg-primary/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
            >
              Show all categories
            </button>
          )}
        </div>

        <MasonryGrid
          creations={filteredCreations}
          onCreationClick={setSelectedCreation}
        />
      </section>

      {selectedCreation && (
        <CreationModal
          key={selectedCreation.id}
          creation={selectedCreation}
          onClose={() => setSelectedCreation(null)}
        />
      )}
    </main>
  );
}

export default ExplorePage;
