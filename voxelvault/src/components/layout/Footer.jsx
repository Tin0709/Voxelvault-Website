import { Link } from "react-router";
import Brand from '../ui/Brand';

function Footer() {
  function scrollToTop() {
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    window.scrollTo({
      top: 0,
      behavior: prefersReducedMotion ? "instant" : "smooth",
    });
  }

  return (
    <footer className="border-t border-white/10">
      <div className="mx-auto max-w-[1600px] px-6 py-10 lg:px-10">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Link
              to="/"
              className="font-headline-lg text-xl tracking-tight text-on-surface"
            >
              <Brand />
            </Link>

            <p className="mt-2 max-w-sm text-sm leading-relaxed text-on-surface-variant">
              A home for extraordinary worlds and the ideas behind them.
            </p>
          </div>

          <button
            type="button"
            onClick={scrollToTop}
            className="flex w-fit items-center gap-2 rounded-full border border-white/15 px-5 py-3 text-sm text-on-surface transition hover:border-primary/40 hover:bg-primary/5 hover:text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
          >
            Back to top
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M12 19V5M5 12l7-7 7 7" />
            </svg>
          </button>
        </div>

        <div className="mt-8 flex flex-col gap-2 border-t border-white/5 pt-6 text-xs leading-relaxed text-on-surface-variant sm:flex-row sm:justify-between">
          <p>VoxelVault · {new Date().getFullYear()}</p>
          <p>Images and builds belong to their respective creators.</p>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
