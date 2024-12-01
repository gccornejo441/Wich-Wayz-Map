import { Routes, Route } from "react-router-dom";
import MapBox from "../Map/MapBox";
import NotFound from "./NotFound";
import AddShop from "../Modal/AddShop";
import PrivacyPolicy from "./PrivacyPolicy";
import SignIn from "./SignIn";
import Register from "./Register";
import UserProfile from "./UserProfile";
import CheckoutForm from "./Checkout";
import { Elements } from "@stripe/react-stripe-js";
import { loadStripe, StripeElementsUpdateOptions } from "@stripe/stripe-js";

const stripePromise = loadStripe("pk_test_6pRNASCoBOKtIshFeQd4XMUh");

const options: StripeElementsUpdateOptions = {
  mode: "payment",

  amount: 1099,
  currency: "usd",
  appearance: {
    theme: "stripe",
    variables: {
      colorPrimary: "#DA291C",
    },
  },
};

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
      <Route
        path="/checkout"
        element={
          <Elements stripe={stripePromise} options={options}>
            <CheckoutForm />
          </Elements>
        }
      />{" "}
    </Routes>
  );
}

export default MainRoutes;
