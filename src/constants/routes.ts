import { useLocation } from "react-router-dom";

export interface Routes {
  HOME: string;
  NOT_FOUND: string;
  SHOPS: {
    ADD: string;
  };
  ACCOUNT: {
    SIGN_IN: string;
    REGISTER: string;
    PROFILE: string;
  };
  LEGAL: {
    PRIVACY_POLICY: string;
    TERMS_OF_SERVICE: string;
  };
  PAYMENT: {
    SUCCESS: string;
  };
}

export const ROUTES: Routes = {
  HOME: "/",
  NOT_FOUND: "*",
  SHOPS: {
    ADD: "/shops/add",
  },
  ACCOUNT: {
    SIGN_IN: "/account/sign-in",
    REGISTER: "/account/register",
    PROFILE: "/account/profile",
  },
  LEGAL: {
    PRIVACY_POLICY: "/privacy-policy",
    TERMS_OF_SERVICE: "/terms-of-service",
  },
  PAYMENT: {
    SUCCESS: "/payment/success",
  },
};

/**
 * Checks if the current route is valid and if the search bar should be shown.
 */
export const useRouteCheck = (routes: Routes) => {
  const location = useLocation();

  const flattenedRoutes = Object.values(routes).reduce((acc, value) => {
    if (typeof value === "string") {
      acc.push(value);
    } else if (typeof value === "object") {
      acc.push(...Object.values(value));
    }
    return acc;
  }, []);

  const isPathValid = flattenedRoutes.includes(location.pathname);

  return {
    isPathValid,
    showSearchBar: location.pathname === ROUTES.HOME,
    showAddShop: location.pathname === ROUTES.HOME,
    showUserProfile: location.pathname === ROUTES.HOME,
    showMap: location.pathname !== ROUTES.HOME,
  };
};
