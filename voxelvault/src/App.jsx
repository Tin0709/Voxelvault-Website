import Header from "./components/layout/Header";

function App() {
  return (
    <div className="min-h-screen bg-background font-body-md text-on-surface">
      <Header />

      <main className="mx-auto max-w-[1600px] px-6 py-16 lg:px-10">
        <p className="text-xs font-medium uppercase tracking-[0.25em] text-primary">
          A curated world of blocks
        </p>

        <h1 className="mt-4 max-w-3xl font-headline-lg text-4xl leading-tight tracking-tight sm:text-6xl">
          Small blocks.
          <br />
          <span className="text-primary">Endless possibilities.</span>
        </h1>

        <p className="mt-6 max-w-xl text-base leading-relaxed text-on-surface-variant">
          Explore extraordinary Minecraft worlds, discover your next
          inspiration, and find a creation to make your own.
        </p>
      </main>
    </div>
  );
}

export default App;
