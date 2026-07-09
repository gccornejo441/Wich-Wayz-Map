import { Navigate, Routes, Route } from "react-router-dom";
import { useAuth } from "@context/authContext";
import MapBox from "../Map/MapBox";
import NotFound from "./NotFound";
import PrivacyPolicy from "./PrivacyPolicy";
import UserProfile from "./UserProfile";
import PaymentSuccess from "./PaymentSuccess";
import { ROUTES } from "../../constants/routes";
import TermsOfService from "./TermsOfService";
import AdminSettings from "./AdminSettings";
import AddShop from "./AddEditShop";
import Analytics from "./Analytics";
import UserLeaderboard from "./UserLeaderboard";
import AppLayout from "./AppLayout";
import PublicCollection from "./PublicCollection";
import PublicUserProfile from "./PublicUserProfile";
import Register from "./Register";
import SignIn from "./SignIn";
import EmailVerification from "./EmailVerification";
import CommunityGuidelines from "./CommunityGuidelines";
import About from "./About";
import { ReactNode } from "react";

/**
 * Redirects unauthenticated users to the sign-in page before rendering a
 * protected route. Auth state is resolved by Firebase before this runs, so
 * there is no flash of protected content.
 */
function ProtectedRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) {
    return <Navigate to={ROUTES.ACCOUNT.SIGN_IN} replace />;
  }
  return <>{children}</>;
}

function MainRoutes() {
  return (
    <Routes>
      <Route element={<AppLayout fullBleed />}>
        <Route path={ROUTES.HOME} element={<MapBox />} />
        <Route
          path={ROUTES.COLLECTIONS.PUBLIC}
          element={<PublicCollection />}
        />
      </Route>

      <Route element={<AppLayout />}>
        {/* Public routes */}
        <Route path={ROUTES.ABOUT} element={<About />} />
        <Route path={ROUTES.LEGAL.PRIVACY_POLICY} element={<PrivacyPolicy />} />
        <Route
          path={ROUTES.LEGAL.TERMS_OF_SERVICE}
          element={<TermsOfService />}
        />
        <Route
          path={ROUTES.LEGAL.COMMUNITY_GUIDELINES}
          element={<CommunityGuidelines />}
        />
        <Route path={ROUTES.USER_LEADERBOARD} element={<UserLeaderboard />} />
        <Route
          path={ROUTES.USERS.PUBLIC_PROFILE}
          element={<PublicUserProfile />}
        />
        <Route path={ROUTES.ACCOUNT.REGISTER} element={<Register />} />
        <Route path={ROUTES.ACCOUNT.SIGN_IN} element={<SignIn />} />
        <Route
          path={ROUTES.ACCOUNT.EMAIL_VERIFICATION}
          element={<EmailVerification />}
        />

        {/* Protected routes — require authentication */}
        <Route
          path={ROUTES.SHOPS.ADD}
          element={
            <ProtectedRoute>
              <AddShop />
            </ProtectedRoute>
          }
        />
        <Route
          path={ROUTES.ANALYTICS}
          element={
            <ProtectedRoute>
              <Analytics />
            </ProtectedRoute>
          }
        />
        <Route
          path={ROUTES.ACCOUNT.PROFILE}
          element={
            <ProtectedRoute>
              <UserProfile />
            </ProtectedRoute>
          }
        />
        <Route
          path={ROUTES.ACCOUNT.ADMIN_SETTINGS}
          element={
            <ProtectedRoute>
              <AdminSettings />
            </ProtectedRoute>
          }
        />
        <Route
          path={ROUTES.PAYMENT.SUCCESS}
          element={
            <ProtectedRoute>
              <PaymentSuccess />
            </ProtectedRoute>
          }
        />

        {/* Catch-all */}
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}

export default MainRoutes;
