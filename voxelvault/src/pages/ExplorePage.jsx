import { useState } from "react";
import ExploreHero from "../components/explore/ExploreHero";
import FilterBar from "../components/explore/FilterBar";
import MasonryGrid from "../components/explore/MasonryGrid";
import { creations } from "../data/creations";

function ExplorePage() {
  const [activeCategory, setActiveCategory] = useState("all");

  const filteredCreations =
    activeCategory === "all"
      ? creations
      : creations.filter((creation) => creation.category === activeCategory);

  return (
    <main className="mx-auto max-w-[1600px] px-6 pb-16 lg:px-10">
      <ExploreHero />

      <FilterBar
        activeCategory={activeCategory}
        onCategoryChange={setActiveCategory}
      />

      <section aria-label="Creations" className="pt-6">
        <p role="status" className="mb-6 text-sm text-on-surface-variant">
          {filteredCreations.length}{" "}
          {filteredCreations.length === 1 ? "creation" : "creations"}
        </p>

        <MasonryGrid creations={filteredCreations} />
      </section>
    </main>
  );
}

export default ExplorePage;
