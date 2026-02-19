import { Link } from "react-router-dom";
import { ROUTES } from "../../constants/routes";

const CONTACT_EMAIL = "wich.wayz.map@gmail.com";

const CTA_BASE =
  "inline-flex items-center justify-center rounded-xl px-4 py-2.5 text-sm font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2";
const CTA_PRIMARY = `${CTA_BASE} bg-brand-primary text-text-inverted hover:bg-brand-primaryHover focus-visible:ring-brand-primary focus-visible:ring-offset-surface-light dark:focus-visible:ring-offset-surface-dark`;

const TEXT_LINK =
  "text-sm text-brand-primary underline underline-offset-2 decoration-brand-primary/40 hover:decoration-brand-primary dark:text-brand-secondary dark:decoration-brand-secondary/50 dark:hover:decoration-brand-secondary transition";

const Card =
  "rounded-3xl border border-surface-muted bg-surface-light dark:border-surface-muted/10 dark:bg-surface-darker";

const About = () => {
  const version = (import.meta as { env?: { VITE_BUILD_VERSION?: string } }).env
    ?.VITE_BUILD_VERSION;

  return (
    <main role="main" className="mt-6 md:mt-10">
      <div id="inner-content">
        <article className="mx-auto max-w-3xl px-4 lg:px-0 pb-16 md:pb-24 lg:pb-32">
          {/* Hero Section */}
          <div className={`relative overflow-hidden ${Card}`}>
            <div className="relative px-6 py-10 md:px-10 md:py-14">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-2 rounded-full border border-surface-muted bg-surface-light/80 px-3 py-1 text-xs font-semibold text-text-base backdrop-blur dark:border-surface-muted/10 dark:bg-surface-darker/70 dark:text-text-inverted/85">
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-brand-primary" />
                  Map-first sandwich discovery
                </span>

                {version && (
                  <span className="inline-flex items-center rounded-full border border-surface-muted bg-surface-light/80 px-3 py-1 text-xs font-semibold text-text-base backdrop-blur dark:border-surface-muted/10 dark:bg-surface-darker/70 dark:text-text-inverted/85">
                    Version {version}
                  </span>
                )}
              </div>

              <h1 className="mt-5 text-4xl md:text-6xl leading-[0.98] tracking-tight text-brand-primary dark:text-brand-secondary">
                About Wich Wayz
              </h1>

              <p className="mt-4 max-w-2xl text-base md:text-lg text-text-muted dark:text-text-inverted/70">
                A map-first sandwich locator for finding and saving great spots
                near you.
              </p>

              <div className="mt-7 flex flex-wrap items-center gap-4">
                <Link to={ROUTES.HOME} className={CTA_PRIMARY}>
                  Explore the map
                </Link>
                <Link to={ROUTES.SHOPS.SAVED_SHOPS} className={TEXT_LINK}>
                  View saved spots
                </Link>
                <Link to={ROUTES.SHOPS.ADD} className={TEXT_LINK}>
                  Add a shop
                </Link>
              </div>
            </div>
          </div>

          {/* What is Wich Wayz */}
          <div className={`mt-10 md:mt-14 ${Card} p-6 md:p-8`}>
            <h2 className="text-xl md:text-2xl font-semibold text-brand-primary dark:text-brand-secondary">
              What is Wich Wayz?
            </h2>

            <div className="mt-4 space-y-4 text-text-base dark:text-text-inverted/80">
              <p>
                Wich Wayz helps you discover sandwich shops using an interactive
                map and a fast search experience. Explore what's nearby, open
                shop details, and save places you want to try.
              </p>
              <p>
                Our goal is simple: make local sandwich discovery easier by
                organizing great spots in one place and keeping the directory
                useful through responsible contributions.
              </p>
            </div>
          </div>

          {/* How it works */}
          <div className={`mt-8 ${Card} p-6 md:p-8`}>
            <h2 className="text-xl md:text-2xl font-semibold text-brand-primary dark:text-brand-secondary">
              How it works
            </h2>

            <ol className="mt-5 space-y-4">
              <li className="flex gap-4">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-brand-primary text-brand-primary dark:border-brand-secondary dark:text-brand-secondary">
                  1
                </div>
                <div>
                  <div className="font-semibold text-text-base dark:text-text-inverted">
                    Start on the map
                  </div>
                  <div className="mt-1 text-sm text-text-muted dark:text-text-inverted/70">
                    Pan, zoom, and tap markers to see what's nearby.
                  </div>
                </div>
              </li>

              <li className="flex gap-4">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-brand-primary text-brand-primary dark:border-brand-secondary dark:text-brand-secondary">
                  2
                </div>
                <div>
                  <div className="font-semibold text-text-base dark:text-text-inverted">
                    Search to narrow it down
                  </div>
                  <div className="mt-1 text-sm text-text-muted dark:text-text-inverted/70">
                    Find a shop, city, or category and jump right to results.
                  </div>
                </div>
              </li>

              <li className="flex gap-4">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-brand-primary text-brand-primary dark:border-brand-secondary dark:text-brand-secondary">
                  3
                </div>
                <div>
                  <div className="font-semibold text-text-base dark:text-text-inverted">
                    Save what you want to try
                  </div>
                  <div className="mt-1 text-sm text-text-muted dark:text-text-inverted/70">
                    Build a shortlist so deciding later is effortless.
                  </div>
                </div>
              </li>
            </ol>

            <div className="mt-6 flex flex-wrap items-center gap-4">
              <Link to={ROUTES.HOME} className={TEXT_LINK}>
                Go to map
              </Link>
              <span className="text-text-muted dark:text-text-inverted/50">
                •
              </span>
              <Link
                to={ROUTES.LEGAL.COMMUNITY_GUIDELINES}
                className={TEXT_LINK}
              >
                Community guidelines
              </Link>
            </div>
          </div>

          {/* Quick Links & Info Section */}
          <div className={`mt-8 ${Card} p-6 md:p-8`}>
            <h2 className="text-xl md:text-2xl font-semibold text-brand-primary dark:text-brand-secondary">
              Quick links
            </h2>

            <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2">
              <Link to={ROUTES.SHOPS.ADD} className={TEXT_LINK}>
                Add a shop
              </Link>
              <span className="text-text-muted dark:text-text-inverted/50">
                •
              </span>
              <Link to={ROUTES.SHOPS.SAVED_SHOPS} className={TEXT_LINK}>
                Saved shops
              </Link>
              <span className="text-text-muted dark:text-text-inverted/50">
                •
              </span>
              <Link to={ROUTES.ANALYTICS} className={TEXT_LINK}>
                Map analytics
              </Link>
              <span className="text-text-muted dark:text-text-inverted/50">
                •
              </span>
              <Link to={ROUTES.USER_LEADERBOARD} className={TEXT_LINK}>
                Leaderboard
              </Link>
            </div>

            <div className="mt-8 pt-6 border-t border-surface-muted dark:border-surface-muted/10">
              <h3 className="text-sm font-semibold text-text-base dark:text-text-inverted">
                Contact
              </h3>
              <p className="mt-2 text-sm text-text-muted dark:text-text-inverted/70">
                Have feedback or found an issue? Email{" "}
                <a
                  className="font-semibold text-brand-primary underline underline-offset-2 dark:text-brand-secondary"
                  href={`mailto:${CONTACT_EMAIL}`}
                >
                  {CONTACT_EMAIL}
                </a>
              </p>
            </div>

            <div className="mt-6 pt-6 border-t border-surface-muted dark:border-surface-muted/10">
              <h3 className="text-sm font-semibold text-text-base dark:text-text-inverted">
                Policies
              </h3>
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-2 text-sm">
                <Link to={ROUTES.LEGAL.PRIVACY_POLICY} className={TEXT_LINK}>
                  Privacy policy
                </Link>
                <span className="text-text-muted dark:text-text-inverted/50">
                  •
                </span>
                <Link to={ROUTES.LEGAL.TERMS_OF_SERVICE} className={TEXT_LINK}>
                  Terms of service
                </Link>
                <span className="text-text-muted dark:text-text-inverted/50">
                  •
                </span>
                <Link
                  to={ROUTES.LEGAL.COMMUNITY_GUIDELINES}
                  className={TEXT_LINK}
                >
                  Community guidelines
                </Link>
              </div>
            </div>

            <div className="mt-6 pt-6 border-t border-surface-muted dark:border-surface-muted/10">
              <h3 className="text-sm font-semibold text-text-base dark:text-text-inverted">
                What you can do
              </h3>
              <ul className="mt-3 space-y-2 text-sm text-text-muted dark:text-text-inverted/70">
                <li className="flex items-start gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-brand-primary dark:bg-brand-secondary" />
                  <span>Browse sandwich shops on the map</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-brand-primary dark:bg-brand-secondary" />
                  <span>Search by shop, city, or category</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-brand-primary dark:bg-brand-secondary" />
                  <span>Save places you want to revisit</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-brand-primary dark:bg-brand-secondary" />
                  <span>Review community guidelines for contributing</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Final CTA */}
          <div className={`mt-10 md:mt-14 ${Card} p-6 md:p-8`}>
            <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
              <div>
                <h2 className="text-xl md:text-2xl font-semibold text-brand-primary dark:text-brand-secondary">
                  Ready to find a new favorite?
                </h2>
                <p className="mt-2 text-sm md:text-base text-text-muted dark:text-text-inverted/70">
                  Open the map, save a few spots, and you'll always have a
                  sandwich plan.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-4">
                <Link to={ROUTES.HOME} className={CTA_PRIMARY}>
                  Explore now
                </Link>
                <Link to={ROUTES.SHOPS.SAVED_SHOPS} className={TEXT_LINK}>
                  My saved list
                </Link>
              </div>
            </div>
          </div>
        </article>
      </div>
    </main>
  );
};

export default About;
