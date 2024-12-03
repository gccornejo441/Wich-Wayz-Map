import { useEffect, useState } from "react";
import { useAuth } from "../../context/authContext";
import { updateData } from "../../services/apiClient";

const PaymentSuccess = () => {
  const { userMetadata } = useAuth();
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const queryParams = new URLSearchParams(window.location.search);
    const paymentIntentClientSecret = queryParams.get("payment_intent_client_secret");

    if (!paymentIntentClientSecret) {
      setMessage("Payment verification failed. Please contact support.");
      setLoading(false);
      return;
    }

    // Verify payment status with your server
    fetch(`/api/verify-payment?client_secret=${paymentIntentClientSecret}`)
      .then((response) => response.json())
      .then(async (data) => {
        if (data.status === "succeeded" && userMetadata?.firebaseUid) {
          // Update membership status in the database
          await updateData(
            "users",
            { membership_status: "member" },
            "firebase_uid = ?",
            [userMetadata.firebaseUid]
          );
          setMessage("Your membership has been successfully updated!");
        } else {
          setMessage("Payment verification failed. Please contact support.");
        }
      })
      .catch((error) => {
        console.error("Payment verification error:", error);
        setMessage("An error occurred. Please try again.");
      })
      .finally(() => setLoading(false));
  }, [userMetadata]);

  if (loading) return <div>Loading...</div>;

  return (
    <div className="max-w-lg mx-auto bg-white shadow-md rounded-lg p-6 mt-10">
      <h2 className="text-xl font-semibold text-gray-800 mb-4">Payment Status</h2>
      <p>{message}</p>
    </div>
  );
};

export default PaymentSuccess;
