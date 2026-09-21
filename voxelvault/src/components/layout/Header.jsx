function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-background/95 backdrop-blur-xl">
      <div className="mx-auto flex max-w-[1600px] flex-wrap items-center gap-5 px-6 py-4 lg:px-10">
        {/* Logo */}
        <a
          href="/"
          className="flex shrink-0 items-center gap-3"
          aria-label="VoxelVault home"
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-on-primary">
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="m12 3 8 4.5v9L12 21l-8-4.5v-9L12 3Z" />
              <path d="m4 7.5 8 4.5 8-4.5M12 12v9" />
            </svg>
          </span>

          <span className="font-headline-lg text-2xl tracking-tight">
            VoxelVault
          </span>
        </a>

        {/* Current page */}
        <nav aria-label="Main navigation" className="ml-auto sm:ml-4">
          <a
            href="/"
            aria-current="page"
            className="rounded-full bg-white/5 px-5 py-2.5 text-sm font-medium text-primary"
          >
            Explore
          </a>
        </nav>

        {/* Search */}
        <div
          role="search"
          className="order-last w-full sm:order-none sm:ml-auto sm:w-auto sm:max-w-md sm:flex-1"
        >
          <label htmlFor="creation-search" className="sr-only">
            Search creations
          </label>

          <div className="relative">
            <svg
              className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              aria-hidden="true"
            >
              <circle cx="10.5" cy="10.5" r="6.5" />
              <path d="m16 16 4.5 4.5" />
            </svg>

            <input
              id="creation-search"
              type="search"
              placeholder="Search worlds, builds, inspiration..."
              className="w-full rounded-full border border-white/10 bg-white/5 py-3 pl-11 pr-4 text-sm text-on-surface outline-none transition placeholder:text-on-surface-variant focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </div>
        </div>
      </div>
    </header>
  );
}

export default Header;
