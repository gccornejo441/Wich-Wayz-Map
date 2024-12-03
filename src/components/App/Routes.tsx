import { Routes, Route } from "react-router-dom";
import MapBox from "../Map/MapBox";
import NotFound from "./NotFound";
import AddShop from "../Modal/AddShop";
import PrivacyPolicy from "./PrivacyPolicy";
import SignIn from "./SignIn";
import Register from "./Register";
import UserProfile from "./UserProfile";
import PaymentSuccess from "./PaymentSuccess";

function MainRoutes() {
  return (
    <Routes>
      <Route path="/" element={<MapBox />} />
      <Route path="*" element={<NotFound />} />
      <Route path="/add-a-shop" element={<AddShop />} />
      <Route path="/privacy-policy" element={<PrivacyPolicy />} />
      <Route path="/signIn" element={<SignIn />} />
      <Route path="/register" element={<Register />} />
      <Route path="/user" element={<UserProfile />} />
      <Route path="/payment-success" element={<PaymentSuccess />} />
    </Routes>
  );
}

export default MainRoutes;
