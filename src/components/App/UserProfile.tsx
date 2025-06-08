import { useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../../context/authContext";
import { resendVerification } from "../../services/firebase";
import AvatarUploader from "../Profile/AvatarUploader";
import Account from "../Profile/Account";
import { updateData } from "../../services/apiClient";
import { userProfileSchema } from "../../constants/validators";
import { useToast } from "../../context/toastContext";
import * as yup from "yup";

const UserProfile = () => {
  const { addToast } = useToast();
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  const { isAuthenticated, user, userMetadata, setUserMetadata } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  const handleUpdateProfile = async () => {
    if (!userMetadata) {
      addToast("User metadata is incomplete. Please try again.", "error");
      return;
    }

    try {
      setValidationErrors([]);

      const validatedData = await userProfileSchema.validate(
        {
          firstName: userMetadata.firstName,
          lastName: userMetadata.lastName,
          username: userMetadata.username,
          avatar: userMetadata.avatar,
        },
        { abortEarly: false },
      );

      const updates = {
        first_name: validatedData.firstName ?? null,
        last_name: validatedData.lastName ?? null,
        username: validatedData.username ?? null,
        avatar: validatedData.avatar ?? null,
      };

      if (!userMetadata.firebaseUid) {
        addToast("Firebase UID is missing. Cannot update profile.", "error");
        return;
      }

      await updateData("users", updates, "firebase_uid = ?", [
        userMetadata.firebaseUid,
      ]);

      setUserMetadata({
        ...userMetadata,
        ...validatedData,
      });

      addToast("Profile updated successfully.", "success");
    } catch (error) {
      if (error instanceof yup.ValidationError) {
        setValidationErrors(error.errors || []);
      } else if (error instanceof Error) {
        console.error("Error updating profile:", error.message);
        addToast("Failed to update profile. Please try again later.", "error");
      } else {
        console.error("Unknown error:", error);
        addToast("An unexpected error occurred.", "error");
      }
    }
  };

  const handleResendVerification = async () => {
    if (!user) {
      addToast("User is not authenticated. Please try again.", "error");
      return;
    }
    try {
      await resendVerification(user);
      addToast("Verification email resent successfully.", "success");
    } catch (error) {
      addToast("Failed to resend verification email.", "error");
      console.error("Error resending verification email:", error);
    }
  };

  return (
    <div className="mt-10 max-w-3xl mx-auto md:p-4 lg:my-5 rounded-lg bg-surface-light dark:bg-surface-dark text-text-base dark:text-text-inverted">
      <div className="p-6 mx-auto bg-surface-light dark:bg-surface-dark pb-4 border-b border-brand-secondary dark:border-brand-secondary">
        <h2 className="text-xl font-semibold text-text-base dark:text-text-inverted mb-2">
          App Settings
        </h2>
        <p className="mt-2 text-sm text-text-muted dark:text-text-inverted">
          Manage your profile and app settings below.
        </p>
      </div>

      {userMetadata ? (
        <>
          <AvatarUploader
            userEmail={userMetadata.email}
            avatarId={userMetadata.avatar || ""}
            setAvatarId={(avatar) =>
              setUserMetadata({ ...userMetadata, avatar })
            }
          />

          <Account
            email={userMetadata.email}
            firstName={userMetadata.firstName || ""}
            setFirstName={(firstName) =>
              setUserMetadata({ ...userMetadata, firstName })
            }
            lastName={userMetadata.lastName || ""}
            setLastName={(lastName) =>
              setUserMetadata({ ...userMetadata, lastName })
            }
            username={userMetadata.username || ""}
            setUsername={(username) =>
              setUserMetadata({ ...userMetadata, username })
            }
            handleUpdateProfile={handleUpdateProfile}
          />
        </>
      ) : (
        <p className="text-text-base dark:text-text-inverted">Loading profile...</p>
      )}

      {!user?.emailVerified && (
        <div className="p-4 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-text-base dark:text-text-inverted">
              Resend Verification:
            </span>
            <button
              onClick={handleResendVerification}
              className="text-sm text-brand-primary hover:underline"
            >
              Send Verification
            </button>
          </div>
        </div>
      )}

      {validationErrors.length > 0 && (
        <ul className="text-red-500 dark:text-red-400 p-4">
          {validationErrors.map((err, idx) => (
            <li key={idx}>{err}</li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default UserProfile;
