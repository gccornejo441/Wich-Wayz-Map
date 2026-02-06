import { useLocation } from "react-router-dom";
import { useAuth } from "../../context/authContext";
import { useEffect, useState } from "react";
import { getUserById } from "../../services/apiClient";
import Confetti from "react-confetti";
import { ROUTES } from "../../constants/routes";

const PaymentSuccess = () => {
  const { setUserMetadata } = useAuth();
  const location = useLocation();
  const [membershipStatus, setMembershipStatus] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [windowDimensions, setWindowDimensions] = useState({
    width: window.innerWidth,
    height: window.innerHeight,
  });

  useEffect(() => {
    const updateSessionMetadata = async (userId: number) => {
      try {
        const userMetadata = await getUserById(userId);
        if (userMetadata) {
          // Map to safe session metadata (exclude sensitive fields)
          const sessionMetadata = {
            id: userMetadata.id,
            firebaseUid: userMetadata.firebaseUid,
            email: userMetadata.email,
            username: userMetadata.username,
            verified: userMetadata.verified,
            verificationToken: userMetadata.verificationToken,
            dateModified: userMetadata.dateModified,
            membershipStatus: userMetadata.membershipStatus,
            firstName: userMetadata.firstName,
            lastName: userMetadata.lastName,
            role: userMetadata.role,
            accountStatus: userMetadata.accountStatus,
            avatar: userMetadata.avatar,
            tokenExpiry: userMetadata.tokenExpiry,
            resetToken: userMetadata.resetToken,
          };
          setUserMetadata(userMetadata);
          sessionStorage.setItem(
            "userMetadata",
            JSON.stringify(sessionMetadata),
          );
          setMembershipStatus(userMetadata.membershipStatus);
          setUserName(userMetadata.username);
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

  useEffect(() => {
    const handleResize = () => {
      setWindowDimensions({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-[100dvh] bg-gray-50">
      <Confetti
        width={windowDimensions.width}
        height={windowDimensions.height}
      />
      <h1 className="text-4xl font-bold text-green-600">
        🎉 Payment Successful! 🎉
      </h1>
      <p className="text-lg text-gray-700 mt-4">
        {userName ? `Welcome, ${userName}! ` : ""} Your membership has been
        successfully updated.
      </p>
      {membershipStatus && (
        <p className="text-lg mt-4">
          <strong>Membership Status:</strong> {membershipStatus}
        </p>
      )}
      <button
        onClick={() => (window.location.href = ROUTES.HOME)}
        className="mt-6 px-6 py-3 bg-primary text-white font-semibold rounded-lg shadow hover:bg-secondary"
      >
        Go to Map
      </button>
    </div>
  );
};

export default PaymentSuccess;
