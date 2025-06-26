import { useLocation } from "react-router-dom";

export interface Routes {
  HOME: string;
  NOT_FOUND: string;
  SHOPS: {
    ADD: string;
    SAVED_SHOPS: string;
  };
  ACCOUNT: {
    SIGN_IN: string;
    REGISTER: string;
    PROFILE: string;
    ADMIN_SETTINGS: string;
  };
  LEGAL: {
    PRIVACY_POLICY: string;
    TERMS_OF_SERVICE: string;
  };
  PAYMENT: {
    SUCCESS: string;
  };
  ANALYTICS: string;
  USER_LEADERBOARD: string;
}

export const ROUTES: Routes = {
  HOME: "/",
  NOT_FOUND: "*",
  SHOPS: {
    ADD: "/shops/add",
    SAVED_SHOPS: "/shops/saved",
  },
  ACCOUNT: {
    SIGN_IN: "/account/sign-in",
    REGISTER: "/account/register",
    PROFILE: "/account/profile",
    ADMIN_SETTINGS: "/account/admin-settings",
  },
  LEGAL: {
    PRIVACY_POLICY: "/privacy-policy",
    TERMS_OF_SERVICE: "/terms-of-service",
  },
  PAYMENT: {
    SUCCESS: "/payment/success",
  },
  ANALYTICS: "/analytics",
  USER_LEADERBOARD: "/user-leaderboard",
};

/**
 * Checks if the current route is valid and if the search bar should be shown.
 */
export const useRouteCheck = (routes: Routes) => {
  const location = useLocation();

  const flattenedRoutes = Object.values(routes).reduce<string[]>(
    (acc, value) => {
      if (typeof value === "string") {
        acc.push(value);
      } else if (typeof value === "object") {
        acc.push(
          ...Object.values(value).filter(
            (v): v is string => typeof v === "string",
          ),
        );
      }
      return acc;
    },
    [],
  );

  const isPathValid = flattenedRoutes.includes(location.pathname);

  const isHomePage = location.pathname === ROUTES.HOME;
  const isAccountProfile = location.pathname === ROUTES.ACCOUNT.PROFILE;
  const isAddShopPage = location.pathname === ROUTES.SHOPS.ADD;
  const isSignInPage = location.pathname === ROUTES.ACCOUNT.SIGN_IN;

  const isPrivacyOrTOS =
    location.pathname === ROUTES.LEGAL.PRIVACY_POLICY ||
    location.pathname === ROUTES.LEGAL.TERMS_OF_SERVICE ||
    location.pathname === ROUTES.ANALYTICS ||
    location.pathname === ROUTES.USER_LEADERBOARD;

  return {
    isPathValid,
    showSearchBar: isHomePage,
    showAddShop: isHomePage,
    showUserProfile: isHomePage,
    showMap:
      (!isHomePage && isAccountProfile) ||
      isPrivacyOrTOS ||
      isAddShopPage ||
      isSignInPage,
  };
};
