import {
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import { useState } from "react";

const CheckoutForm = () => {
  const stripe = useStripe();
  const elements = useElements();

  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!stripe || !elements) {
      setErrorMessage("Stripe.js has not loaded. Please try again.");
      return;
    }

    try {
      const { error: submitError } = await elements.submit();
      if (submitError) {
        setErrorMessage(submitError.message || "An error occurred.");
        return;
      }

      const response = await fetch("/create-intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: 1099, currency: "usd" }),
      });

      if (!response.ok) {
        throw new Error("Failed to create PaymentIntent.");
      }

      const { client_secret: clientSecret } = await response.json();

      const { error } = await stripe.confirmPayment({
        elements,
        clientSecret,
        confirmParams: {
          return_url: "https://example.com/order/123/complete",
        },
      });

      if (error) {
        setErrorMessage(error.message || "Payment confirmation failed.");
      } else {
        setErrorMessage(null);
      }
    } catch (err) {
      setErrorMessage("An error occurred. Please try again.");
      console.error(err);
    }
  };

  return (
    <div className="max-w-lg mx-auto bg-white shadow-md rounded-lg p-6 mt-10">
      <h2 className="text-xl font-semibold text-gray-800 mb-4">
        Complete Your Payment
      </h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="mb-4">
          <PaymentElement />
        </div>
        {errorMessage && (
          <div className="text-red-600 text-sm border border-red-500 rounded-md p-2 bg-red-50">
            {errorMessage}
          </div>
        )}
        <button
          type="submit"
          disabled={!stripe || !elements}
          className="w-full bg-primary text-white py-2 rounded-md hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Pay
        </button>
      </form>
    </div>
  );
};

export default CheckoutForm;
