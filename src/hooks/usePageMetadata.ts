import { useEffect, useMemo } from "react";
import { matchPath, useLocation } from "react-router-dom";
import { ROUTES } from "@/constants/routes";

interface PageMetadata {
  title: string;
  description: string;
  path?: string;
}

const SITE_URL = "https://wichwayz.com";
const DEFAULT_DESCRIPTION =
  "Find sandwich shops near you, add your favorites, and explore the best local sandwich spots with Wich Wayz.";

const routeMetadata: PageMetadata[] = [
  {
    path: ROUTES.HOME,
    title: "Wich Wayz - Sandwich Shop Map",
    description: DEFAULT_DESCRIPTION,
  },
  {
    path: ROUTES.ABOUT,
    title: "About Wich Wayz",
    description:
      "Learn about Wich Wayz, a community map for discovering and sharing sandwich shops.",
  },
  {
    path: ROUTES.SHOPS.ADD,
    title: "Add a Sandwich Shop - Wich Wayz",
    description:
      "Submit a sandwich shop to the Wich Wayz community map and help others find local favorites.",
  },
  {
    path: ROUTES.ANALYTICS,
    title: "Sandwich Shop Analytics - Wich Wayz",
    description:
      "Explore Wich Wayz sandwich shop data, categories, and location trends.",
  },
  {
    path: ROUTES.USER_LEADERBOARD,
    title: "Wich Wayz Leaderboard",
    description:
      "See top Wich Wayz community contributors adding and sharing sandwich shops.",
  },
  {
    path: ROUTES.ACCOUNT.SIGN_IN,
    title: "Sign In - Wich Wayz",
    description: "Sign in to Wich Wayz to save shops and add sandwich spots.",
  },
  {
    path: ROUTES.ACCOUNT.REGISTER,
    title: "Create an Account - Wich Wayz",
    description:
      "Create a Wich Wayz account to save shops and contribute to the sandwich map.",
  },
  {
    path: ROUTES.LEGAL.PRIVACY_POLICY,
    title: "Privacy Policy - Wich Wayz",
    description: "Read the Wich Wayz privacy policy.",
  },
  {
    path: ROUTES.LEGAL.TERMS_OF_SERVICE,
    title: "Terms of Service - Wich Wayz",
    description: "Read the Wich Wayz terms of service.",
  },
  {
    path: ROUTES.LEGAL.COMMUNITY_GUIDELINES,
    title: "Community Guidelines - Wich Wayz",
    description: "Read the Wich Wayz community guidelines.",
  },
  {
    path: ROUTES.USERS.PUBLIC_PROFILE,
    title: "Wich Wayz User Profile",
    description: "View a Wich Wayz community member profile.",
  },
  {
    path: ROUTES.COLLECTIONS.PUBLIC,
    title: "Wich Wayz Shop List",
    description: "View a shared Wich Wayz sandwich shop list.",
  },
];

const getOrCreateHeadElement = <T extends HTMLElement>(
  selector: string,
  create: () => T,
) => {
  const existing = document.head.querySelector<T>(selector);
  if (existing) return existing;

  const element = create();
  document.head.appendChild(element);
  return element;
};

export const usePageMetadata = () => {
  const location = useLocation();

  const metadata = useMemo(() => {
    const match = routeMetadata.find((item) => {
      if (!item.path) return false;
      return matchPath({ path: item.path, end: true }, location.pathname);
    });

    return (
      match ?? {
        title: "Wich Wayz? - A Sandwich Locator",
        description: DEFAULT_DESCRIPTION,
      }
    );
  }, [location.pathname]);

  useEffect(() => {
    const canonicalUrl = `${SITE_URL}${location.pathname}`;

    document.title = metadata.title;

    const description = getOrCreateHeadElement('meta[name="description"]', () =>
      document.createElement("meta"),
    );
    description.setAttribute("name", "description");
    description.setAttribute("content", metadata.description);

    const ogTitle = getOrCreateHeadElement('meta[property="og:title"]', () =>
      document.createElement("meta"),
    );
    ogTitle.setAttribute("property", "og:title");
    ogTitle.setAttribute("content", metadata.title);

    const ogDescription = getOrCreateHeadElement(
      'meta[property="og:description"]',
      () => document.createElement("meta"),
    );
    ogDescription.setAttribute("property", "og:description");
    ogDescription.setAttribute("content", metadata.description);

    const ogUrl = getOrCreateHeadElement('meta[property="og:url"]', () =>
      document.createElement("meta"),
    );
    ogUrl.setAttribute("property", "og:url");
    ogUrl.setAttribute("content", canonicalUrl);

    const canonical = getOrCreateHeadElement('link[rel="canonical"]', () =>
      document.createElement("link"),
    );
    canonical.setAttribute("rel", "canonical");
    canonical.setAttribute("href", canonicalUrl);
  }, [location.pathname, metadata]);
};
