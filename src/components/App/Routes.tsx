import { Routes, Route } from "react-router-dom";
import MapBox from "../Map/MapBox";
import NotFound from "./NotFound";
import PrivacyPolicy from "./PrivacyPolicy";
import Register from "./Register";
import UserProfile from "./UserProfile";
import PaymentSuccess from "./PaymentSuccess";
import SignIn from "./SignIn";
import { ROUTES } from "../../constants/routes";
import TearmsOfService from "./TermsOfService";
import AdminSettings from "./AdminSettings";
import AddShop from "./AddEditShop";
import Analytics from "./Analytics";
import UserLeaderboard from "./UserLeaderboard";
import MapSidebar from "../Sidebar/MapSidebar";
// import ShopListSidebar from "../Sidebar/ShopListSidebar";

function MainRoutes() {
  return (
    <>
      <MapSidebar />
      {/* <ShopListSidebar />  */}
      <Routes>
        <Route path={ROUTES.HOME} element={<MapBox />} />
        <Route path={ROUTES.NOT_FOUND} element={<NotFound />} />
        <Route path={ROUTES.SHOPS.ADD} element={<AddShop />} />
        <Route path={ROUTES.LEGAL.PRIVACY_POLICY} element={<PrivacyPolicy />} />
        <Route
          path={ROUTES.LEGAL.TERMS_OF_SERVICE}
          element={<TearmsOfService />}
        />
        <Route path={ROUTES.ANALYTICS} element={<Analytics />} />
        <Route path={ROUTES.ACCOUNT.SIGN_IN} element={<SignIn />} />
        <Route path={ROUTES.ACCOUNT.REGISTER} element={<Register />} />
        <Route path={ROUTES.ACCOUNT.PROFILE} element={<UserProfile />} />
        <Route path={ROUTES.ACCOUNT.ADMIN_SETTINGS} element={<AdminSettings />} />
        <Route path={ROUTES.PAYMENT.SUCCESS} element={<PaymentSuccess />} />
        <Route path={ROUTES.USER_LEADERBOARD} element={<UserLeaderboard />} />
      </Routes>
    </>
  );
}

export default MainRoutes;
