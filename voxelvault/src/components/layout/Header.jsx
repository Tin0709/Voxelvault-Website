import { Link, NavLink } from "react-router";

function Header({ searchQuery, onSearchChange }) {
  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-background/95 backdrop-blur-xl">
      <div className="mx-auto flex max-w-[1600px] flex-wrap items-center gap-5 px-6 py-4 lg:px-10">
        <Link
          to="/"
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
        </Link>

        <nav
          aria-label="Main navigation"
          className="ml-auto flex flex-wrap items-center gap-2 sm:ml-4"
        >
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              `rounded-full px-4 py-2.5 text-sm font-medium transition ${
                isActive
                  ? "bg-white/5 text-primary"
                  : "text-on-surface-variant hover:text-primary"
              }`
            }
          >
            Explore
          </NavLink>

          <NavLink
            to="/my-posts"
            className={({ isActive }) =>
              `rounded-full px-4 py-2.5 text-sm font-medium transition ${
                isActive
                  ? "bg-white/5 text-primary"
                  : "text-on-surface-variant hover:text-primary"
              }`
            }
          >
            My Posts
          </NavLink>

          <NavLink
            to="/create"
            className={({ isActive }) =>
              `inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2.5 text-sm font-medium text-on-primary transition hover:opacity-90 ${
                isActive
                  ? "ring-2 ring-primary/40 ring-offset-2 ring-offset-background"
                  : ""
              }`
            }
          >
            <span aria-hidden="true">+</span>
            Create
          </NavLink>
        </nav>

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
              value={searchQuery}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder="Search worlds, builds, inspiration..."
              className="w-full rounded-full border border-white/10 bg-white/5 py-3 pl-11 pr-4 text-sm text-on-surface outline-none transition placeholder:text-on-surface-variant focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </div>
        </div>
        <Link
          to="/login"
          className="shrink-0 rounded-full border border-white/15 px-4 py-2.5 text-sm font-medium text-on-surface transition hover:border-primary/40 hover:text-primary"
        >
          Sign in
        </Link>
      </div>
    </header>
  );
}

export default Header;
