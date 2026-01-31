import { Routes, Route } from "react-router-dom";
import MapBox from "../Map/MapBox";
import NotFound from "./NotFound";
import PrivacyPolicy from "./PrivacyPolicy";
import UserProfile from "./UserProfile";
import PaymentSuccess from "./PaymentSuccess";
import { ROUTES } from "../../constants/routes";
import TearmsOfService from "./TermsOfService";
import AdminSettings from "./AdminSettings";
import AddShop from "./AddEditShop";
import Analytics from "./Analytics";
import UserLeaderboard from "./UserLeaderboard";
import AppLayout from "./AppLayout";
import PublicCollection from "./PublicCollection";

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
        <Route path={ROUTES.NOT_FOUND} element={<NotFound />} />
        <Route path={ROUTES.SHOPS.ADD} element={<AddShop />} />
        <Route path={ROUTES.LEGAL.PRIVACY_POLICY} element={<PrivacyPolicy />} />
        <Route
          path={ROUTES.LEGAL.TERMS_OF_SERVICE}
          element={<TearmsOfService />}
        />
        <Route path={ROUTES.ANALYTICS} element={<Analytics />} />
        <Route path={ROUTES.ACCOUNT.PROFILE} element={<UserProfile />} />
        <Route
          path={ROUTES.ACCOUNT.ADMIN_SETTINGS}
          element={<AdminSettings />}
        />
        <Route path={ROUTES.PAYMENT.SUCCESS} element={<PaymentSuccess />} />
        <Route path={ROUTES.USER_LEADERBOARD} element={<UserLeaderboard />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}

export default MainRoutes;
