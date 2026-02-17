import { Link } from "react-router-dom";
import { ROUTES } from "../../constants/routes";

const CONTACT_EMAIL = "wich.wayz.map@gmail.com";

const CTA_BASE =
  "inline-flex items-center justify-center rounded-xl px-4 py-2.5 text-sm font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2";
const CTA_PRIMARY = `${CTA_BASE} bg-brand-primary text-text-inverted hover:bg-brand-primaryHover focus-visible:ring-brand-primary focus-visible:ring-offset-surface-light dark:focus-visible:ring-offset-surface-dark`;
const CTA_SECONDARY = `${CTA_BASE} bg-brand-secondary text-text-base border border-brand-secondaryBorder hover:bg-brand-secondaryHover focus-visible:ring-brand-secondary focus-visible:ring-offset-surface-light dark:focus-visible:ring-offset-surface-dark`;
const CTA_TERTIARY = `${CTA_BASE} bg-surface-muted text-text-base border border-surface-muted hover:opacity-90 focus-visible:ring-brand-primary focus-visible:ring-offset-surface-light dark:bg-surface-darker dark:text-text-inverted dark:border-brand-primaryBorder/40 dark:hover:bg-surface-dark dark:focus-visible:ring-offset-surface-dark`;

const Card =
  "rounded-3xl border border-surface-muted bg-surface-light shadow-card dark:border-brand-primaryBorder/40 dark:bg-surface-darker";

const About = () => {
  const version = (import.meta as { env?: { VITE_BUILD_VERSION?: string } }).env
    ?.VITE_BUILD_VERSION;

  return (
    <main role="main" className="mt-6 md:mt-10">
      <div id="inner-content">
        <article className="mx-auto max-w-5xl px-4 lg:px-0 pb-16 md:pb-24 lg:pb-32">
          <div className={`relative overflow-hidden ${Card}`}>
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute -top-24 -right-24 h-64 w-64 rounded-full bg-brand-primary/15 blur-3xl" />
              <div className="absolute -bottom-28 -left-28 h-64 w-64 rounded-full bg-brand-secondary/20 blur-3xl" />
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(0,0,0,0.02),transparent_60%)] dark:bg-[radial-gradient(ellipse_at_top,rgba(255,255,255,0.04),transparent_60%)]" />
            </div>

            <div className="relative px-6 py-10 md:px-10 md:py-14">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-2 rounded-full border border-surface-muted bg-surface-light/80 px-3 py-1 text-xs font-semibold text-text-base backdrop-blur dark:border-brand-primaryBorder/40 dark:bg-surface-darker/70 dark:text-text-inverted/85">
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-brand-primary" />
                  Map-first sandwich discovery
                </span>

                {version && (
                  <span className="inline-flex items-center rounded-full border border-surface-muted bg-surface-light/80 px-3 py-1 text-xs font-semibold text-text-base backdrop-blur dark:border-brand-primaryBorder/40 dark:bg-surface-darker/70 dark:text-text-inverted/85">
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

              <div className="mt-7 flex flex-wrap gap-3">
                <Link to={ROUTES.HOME} className={CTA_PRIMARY}>
                  Explore the map
                </Link>

                <Link to={ROUTES.SHOPS.SAVED_SHOPS} className={CTA_SECONDARY}>
                  View saved spots
                </Link>

                <Link to={ROUTES.SHOPS.ADD} className={CTA_TERTIARY}>
                  Add a shop
                </Link>
              </div>
            </div>
          </div>

          <section className="mt-10 md:mt-14 grid grid-cols-1 gap-8 lg:grid-cols-12">
            <div className="lg:col-span-7">
              <div className={`${Card} p-6 md:p-8`}>
                <h2 className="text-xl md:text-2xl font-semibold text-brand-primary dark:text-brand-secondary">
                  What is Wich Wayz?
                </h2>

                <div className="mt-4 space-y-4 text-text-base dark:text-text-inverted/80">
                  <p>
                    Wich Wayz helps you discover sandwich shops using an
                    interactive map and a fast search experience. Explore what's
                    nearby, open shop details, and save places you want to try.
                  </p>
                  <p>
                    Our goal is simple: make local sandwich discovery easier by
                    organizing great spots in one place and keeping the
                    directory useful through responsible contributions.
                  </p>
                </div>
              </div>

              <div className={`mt-8 ${Card} p-6 md:p-8`}>
                <h2 className="text-xl md:text-2xl font-semibold text-brand-primary dark:text-brand-secondary">
                  How it works
                </h2>

                <ol className="mt-5 space-y-4">
                  <li className="flex gap-4">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-primary text-text-inverted dark:bg-brand-secondary dark:text-text-base">
                      1
                    </div>
                    <div>
                      <div className="font-semibold text-text-base dark:text-text-inverted">
                        Start on the map
                      </div>
                      <div className="mt-1 text-sm text-text-muted dark:text-text-inverted/70">
                        Pan, zoom, and tap markers to see what’s nearby.
                      </div>
                    </div>
                  </li>

                  <li className="flex gap-4">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-primary text-text-inverted dark:bg-brand-secondary dark:text-text-base">
                      2
                    </div>
                    <div>
                      <div className="font-semibold text-text-base dark:text-text-inverted">
                        Search to narrow it down
                      </div>
                      <div className="mt-1 text-sm text-text-muted dark:text-text-inverted/70">
                        Find a shop, city, or category and jump right to
                        results.
                      </div>
                    </div>
                  </li>

                  <li className="flex gap-4">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-primary text-text-inverted dark:bg-brand-secondary dark:text-text-base">
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

                <div className="mt-6 flex flex-wrap gap-3">
                  <Link to={ROUTES.HOME} className={CTA_PRIMARY}>
                    Go to map
                  </Link>
                  <Link
                    to={ROUTES.LEGAL.COMMUNITY_GUIDELINES}
                    className={CTA_TERTIARY}
                  >
                    Community guidelines
                  </Link>
                </div>
              </div>
            </div>

            <aside className="lg:col-span-5">
              <div className={`${Card} p-6 md:p-8`}>
                <h2 className="text-xl md:text-2xl font-semibold text-brand-primary dark:text-brand-secondary">
                  Quick links
                </h2>

                <div className="mt-5 space-y-3">
                  <Link to={ROUTES.SHOPS.ADD} className={CTA_TERTIARY}>
                    Add a shop
                  </Link>

                  <Link to={ROUTES.SHOPS.SAVED_SHOPS} className={CTA_TERTIARY}>
                    Saved shops
                  </Link>

                  <Link to={ROUTES.ANALYTICS} className={CTA_TERTIARY}>
                    Map analytics
                  </Link>

                  <Link to={ROUTES.USER_LEADERBOARD} className={CTA_TERTIARY}>
                    Leaderboard
                  </Link>
                </div>

                <div className="mt-8 rounded-2xl border border-brand-primaryBorder/20 bg-brand-primary/5 p-5 dark:border-brand-primaryBorder/50 dark:bg-brand-primary/10">
                  <div className="text-sm font-semibold text-text-base dark:text-text-inverted">
                    Contact
                  </div>

                  <p className="mt-2 text-sm text-text-muted dark:text-text-inverted/70">
                    Have feedback or found an issue? Email{" "}
                    <a
                      className="font-semibold text-brand-primary underline underline-offset-2 dark:text-brand-secondary"
                      href={`mailto:${CONTACT_EMAIL}`}
                    >
                      {CONTACT_EMAIL}
                    </a>
                    .
                  </p>
                </div>

                <div className="mt-6 text-sm text-text-muted dark:text-text-inverted/70">
                  <div className="font-semibold text-text-base dark:text-text-inverted">
                    Policies
                  </div>
                  <div className="mt-2 space-y-2">
                    <Link
                      to={ROUTES.LEGAL.PRIVACY_POLICY}
                      className="underline underline-offset-2 decoration-brand-primary/40 hover:decoration-brand-primary dark:decoration-brand-secondary/50 dark:hover:decoration-brand-secondary"
                    >
                      Privacy policy
                    </Link>
                    <div />
                    <Link
                      to={ROUTES.LEGAL.TERMS_OF_SERVICE}
                      className="underline underline-offset-2 decoration-brand-primary/40 hover:decoration-brand-primary dark:decoration-brand-secondary/50 dark:hover:decoration-brand-secondary"
                    >
                      Terms of service
                    </Link>
                    <div />
                    <Link
                      to={ROUTES.LEGAL.COMMUNITY_GUIDELINES}
                      className="underline underline-offset-2 decoration-brand-primary/40 hover:decoration-brand-primary dark:decoration-brand-secondary/50 dark:hover:decoration-brand-secondary"
                    >
                      Community guidelines
                    </Link>
                  </div>
                </div>

                <div className="mt-8 rounded-2xl border border-surface-muted bg-surface-muted p-5 dark:border-brand-primaryBorder/30 dark:bg-surface-dark">
                  <div className="text-sm font-semibold text-text-base dark:text-text-inverted">
                    What you can do
                  </div>
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
            </aside>
          </section>

          <div className={`mt-10 md:mt-14 ${Card} p-6 md:p-8`}>
            <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
              <div>
                <h2 className="text-xl md:text-2xl font-semibold text-brand-primary dark:text-brand-secondary">
                  Ready to find a new favorite?
                </h2>
                <p className="mt-2 text-sm md:text-base text-text-muted dark:text-text-inverted/70">
                  Open the map, save a few spots, and you’ll always have a
                  sandwich plan.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <Link to={ROUTES.HOME} className={CTA_PRIMARY}>
                  Explore now
                </Link>
                <Link to={ROUTES.SHOPS.SAVED_SHOPS} className={CTA_SECONDARY}>
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
