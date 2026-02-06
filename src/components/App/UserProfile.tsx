import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { reload } from "firebase/auth";
import Account from "@components/Profile/Account";
import AvatarUploader from "@components/Profile/AvatarUploader";
import { useAuth } from "@context/authContext";
import { useToast } from "@context/toastContext";
import { ROUTES } from "@constants/routes";
import { updateUserProfile } from "@services/apiClient";
import { resendVerification } from "@services/firebase";
import { userProfileSchema } from "@constants/validators";
import * as yup from "yup";

const UserProfile = () => {
  const { addToast } = useToast();
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [isSendingVerification, setIsSendingVerification] = useState(false);
  const [isRefreshingVerification, setIsRefreshingVerification] =
    useState(false);

  const navigate = useNavigate();
  const { isAuthenticated, user, userMetadata, setUserMetadata } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  const handleAccountDeleted = async () => {
    addToast("Account deleted successfully", "success");
    navigate(ROUTES.HOME, { replace: true });
  };

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

      await updateUserProfile(userMetadata.id, updates);

      setUserMetadata({
        ...userMetadata,
        ...validatedData,
      });

      addToast("Profile updated successfully.", "success");
    } catch (error) {
      if (error instanceof yup.ValidationError) {
        setValidationErrors(error.errors || []);
        addToast("Please fix the highlighted issues and try again.", "error");
      } else if (error instanceof Error) {
        addToast("Failed to update profile. Please try again later.", "error");
      } else {
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
      setIsSendingVerification(true);
      await resendVerification(user);
      addToast("Verification email sent. Check your inbox.", "success");
    } catch (error) {
      addToast("Failed to send verification email.", "error");
      console.error("Error resending verification email:", error);
    } finally {
      setIsSendingVerification(false);
    }
  };

  const handleRefreshVerification = async () => {
    if (!user) {
      addToast("User is not authenticated. Please try again.", "error");
      return;
    }

    try {
      setIsRefreshingVerification(true);
      await reload(user);

      if (user.emailVerified) {
        addToast("Email verification confirmed.", "success");
      } else {
        addToast(
          "Not verified yet. After clicking the link, come back and refresh.",
          "info",
        );
      }
    } catch (error) {
      addToast("Failed to refresh verification status.", "error");
      console.error("Error refreshing verification status:", error);
    } finally {
      setIsRefreshingVerification(false);
    }
  };

  const isBusy = isSendingVerification || isRefreshingVerification;

  return (
    <div className="max-w-3xl mx-auto min-h-[100dvh] mt-6 md:mt-0 py-6">
      <div className="p-6 mx-auto bg-surface-light dark:bg-surface-dark pb-4 border-b border-brand-secondary dark:border-brand-secondary">
        <h2 className="text-xl font-semibold text-text-base dark:text-text-inverted mb-2">
          App Settings
        </h2>
        <p className="mt-2 text-sm text-text-muted dark:text-text-inverted">
          Manage your profile and app settings below.
        </p>
      </div>

      <div className="p-4 space-y-6">
        {user && (
          <div className="rounded-lg border border-brand-secondary bg-surface-light dark:bg-surface-dark">
            <div className="p-4 border-b border-brand-secondary">
              <h3 className="text-sm font-semibold text-text-base dark:text-text-inverted">
                Email Verification
              </h3>
              <p className="mt-1 text-sm text-text-muted dark:text-text-inverted">
                Keep your account secure and ensure you can recover access.
              </p>
            </div>

            <div className="p-4">
              {user.emailVerified ? (
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 h-9 w-9 rounded-full bg-brand-primary/10 dark:bg-brand-primary/15 flex items-center justify-center">
                    <span className="text-brand-primary text-sm font-semibold">
                      ✓
                    </span>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-sm font-semibold text-text-base dark:text-text-inverted">
                        Email verified
                      </div>
                      <button
                        type="button"
                        onClick={handleRefreshVerification}
                        disabled={isBusy}
                        className="text-sm text-brand-primary hover:underline disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {isRefreshingVerification ? "Refreshing..." : "Refresh"}
                      </button>
                    </div>
                    <div className="mt-1 text-sm text-text-muted dark:text-text-inverted">
                      {user.email ?? "Your email"} is verified.
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 h-9 w-9 rounded-full bg-brand-primary/10 dark:bg-brand-primary/15 flex items-center justify-center">
                      <span className="text-brand-primary text-sm font-semibold">
                        !
                      </span>
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-semibold text-text-base dark:text-text-inverted">
                        Email not verified
                      </div>
                      <div className="mt-1 text-sm text-text-muted dark:text-text-inverted">
                        We’ll send a verification link to{" "}
                        <span className="font-medium text-text-base dark:text-text-inverted">
                          {user.email ?? "your email"}
                        </span>
                        .
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-end">
                    <button
                      type="button"
                      onClick={handleResendVerification}
                      disabled={isBusy}
                      className="inline-flex items-center justify-center rounded-md border border-brand-secondary bg-surface-light px-3 py-2 text-sm font-medium text-text-base hover:opacity-90 dark:bg-surface-dark dark:text-text-inverted disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isSendingVerification
                        ? "Sending..."
                        : "Send verification"}
                    </button>
                    <button
                      type="button"
                      onClick={handleRefreshVerification}
                      disabled={isBusy}
                      className="inline-flex items-center justify-center rounded-md bg-brand-primary px-3 py-2 text-sm font-medium text-text-inverted hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isRefreshingVerification
                        ? "Refreshing..."
                        : "I verified, refresh"}
                    </button>
                  </div>

                  <div className="text-xs text-text-muted dark:text-text-inverted">
                    Tip: If you don’t see the email, check spam/junk and search
                    for “verification”.
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {userMetadata ? (
          <>
            <div className="rounded-lg border border-brand-secondary bg-surface-light dark:bg-surface-dark">
              <div className="p-4 border-b border-brand-secondary">
                <h3 className="text-sm font-semibold text-text-base dark:text-text-inverted">
                  Profile Photo
                </h3>
                <p className="mt-1 text-sm text-text-muted dark:text-text-inverted">
                  Choose an avatar shown across the app.
                </p>
              </div>
              <div className="p-4">
                <AvatarUploader
                  userEmail={userMetadata.email}
                  avatarId={userMetadata.avatar || ""}
                  setAvatarId={(avatar) =>
                    setUserMetadata({ ...userMetadata, avatar })
                  }
                />
              </div>
            </div>

            <div className="rounded-lg border border-brand-secondary bg-surface-light dark:bg-surface-dark">
              <div className="p-4 border-b border-brand-secondary">
                <h3 className="text-sm font-semibold text-text-base dark:text-text-inverted">
                  Account
                </h3>
                <p className="mt-1 text-sm text-text-muted dark:text-text-inverted">
                  Update your name and username, or manage your account.
                </p>
              </div>
              <div className="p-4">
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
                  handleUpdateProfile={handleUpdateProfile}
                  userId={userMetadata.id}
                  onAccountDeleted={handleAccountDeleted}
                />
              </div>
            </div>
          </>
        ) : (
          <div className="rounded-lg border border-brand-secondary bg-surface-light dark:bg-surface-dark p-4 text-sm text-text-base dark:text-text-inverted">
            Loading profile...
          </div>
        )}

        {validationErrors.length > 0 && (
          <div className="rounded-lg border border-red-500/40 bg-red-500/10 p-4">
            <div className="text-sm font-semibold text-text-base dark:text-text-inverted">
              Please fix the following
            </div>
            <ul className="mt-2 space-y-1 text-sm text-red-600 dark:text-red-300">
              {validationErrors.map((err, idx) => (
                <li key={idx}>{err}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

export default UserProfile;
