import { Routes, Route } from "react-router-dom";
import MapBox from "../Map/MapBox";
import NotFound from "./NotFound";
import AddShop from "../Modal/AddShop";
import PrivacyPolicy from "./PrivacyPolicy";
import SignIn from "./SignIn";
import Register from "./Register";
import UserProfile from "./UserProfile";
import { Elements } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import PaymentSuccess from "./PaymentSuccess";
import Checkout from "./Checkout";

const STRIPE_PUBLISHABLE_KEY = import.meta.env.VITE_STRIPE_TEST_PUBLISHABLE_KEY;

const stripePromise = loadStripe(STRIPE_PUBLISHABLE_KEY);

const options = {
  mode: "payment",
  amount: 1099,
  currency: "usd",
  appearance: {
    theme: "stripe",
  },
} as const;

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
      <Route
        path="/checkout"
        element={
          <Elements stripe={stripePromise} options={options}>
            <Checkout />
          </Elements>
        }
      />{" "}
    </Routes>
  );
}

export default MainRoutes;
