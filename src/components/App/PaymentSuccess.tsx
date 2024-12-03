import { useLocation } from "react-router-dom";
import { mapToSessionUserMetadata, useAuth } from "../../context/authContext";
import { useEffect, useState } from "react";
import { getUserById } from "../../services/apiClient";

const PaymentSuccess = () => {
  const { setUserMetadata } = useAuth();
  const location = useLocation();
  const [membershipStatus, setMembershipStatus] = useState<string | null>(null);

  useEffect(() => {
    const updateSessionMetadata = async (userId: number) => {
      try {
        const userMetadata = await getUserById(userId);
        if (userMetadata) {
          const sessionMetadata = mapToSessionUserMetadata(userMetadata);
          setUserMetadata(userMetadata);
          sessionStorage.setItem(
            "userMetadata",
            JSON.stringify(sessionMetadata),
          );
          setMembershipStatus(userMetadata.membershipStatus);
        } else {
          console.warn("User metadata not found for userId:", userId);
        }
      } catch (error) {
        console.error("Error retrieving user metadata:", error);
      }
    };

    const queryParams = new URLSearchParams(location.search);
    const userIdParam = queryParams.get("userId");

    if (userIdParam) {
      const userId = parseInt(userIdParam, 10);
      if (!isNaN(userId)) {
        updateSessionMetadata(userId);
      } else {
        console.warn("Invalid userId parameter:", userIdParam);
      }
    }
  }, [location.search, setUserMetadata]);

  return (
    <div>
      <h1>Payment Successful!</h1>
      <p>Your membership has been updated. Thank you!</p>
      {membershipStatus && (
        <p>
          <strong>Your current membership status:</strong> {membershipStatus}
        </p>
      )}
    </div>
  );
};

export default PaymentSuccess;
