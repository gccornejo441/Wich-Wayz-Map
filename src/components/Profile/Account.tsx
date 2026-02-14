import { ChangeEvent, useState } from "react";
import { Callback } from "../../types/dataTypes";
import {
  deleteAccountAndSignOut,
  reauthWithPassword,
  RequiresRecentLoginError,
} from "@services/accountDeletion";

export interface AccountProps {
  email: string;
  firstName: string;
  setFirstName: (value: string) => void;
  lastName: string;
  setLastName: (value: string) => void;
  username: string;
  setUsername: (value: string) => void;
  isUsernameEditable: boolean;
  handleUpdateProfile: Callback;
  onAccountDeleted?: Callback;
  userId: number;
}

const Account = ({
  firstName,
  setFirstName,
  lastName,
  setLastName,
  username,
  setUsername,
  isUsernameEditable,
  email,
  handleUpdateProfile,
  onAccountDeleted,
  userId,
}: AccountProps) => {
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [password, setPassword] = useState("");
  const [needsReauth, setNeedsReauth] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  const handleDeleteClick = () => {
    setIsDeleteOpen(true);
    setConfirmText("");
    setPassword("");
    setNeedsReauth(false);
    setDeleteError("");
  };

  const handleCloseModal = () => {
    setIsDeleteOpen(false);
    setConfirmText("");
    setPassword("");
    setNeedsReauth(false);
    setDeleteError("");
  };

  const handleConfirmDelete = async () => {
    if (confirmText !== "DELETE") {
      setDeleteError('Please type "DELETE" to confirm');
      return;
    }

    if (needsReauth && !password) {
      setDeleteError("Password is required for re-authentication");
      return;
    }

    setIsDeleting(true);
    setDeleteError("");

    try {
      if (needsReauth) {
        await reauthWithPassword(password);
      }

      await deleteAccountAndSignOut(userId);

      if (onAccountDeleted) {
        await onAccountDeleted();
      }
    } catch (error) {
      setIsDeleting(false);

      if (error instanceof RequiresRecentLoginError) {
        setNeedsReauth(true);
        setDeleteError(
          "Recent authentication required. Please enter your password to continue.",
        );
      } else if (error instanceof Error) {
        setDeleteError(error.message);
      } else {
        setDeleteError("Failed to delete account. Please try again.");
      }
    }
  };

  return (
    <>
      <div className="p-6 mx-auto bg-surface-light dark:bg-surface-dark text-text-base dark:text-text-inverted pb-4">
        <h3 className="text-xl font-semibold mb-2">Profile Information</h3>
        <div className="mt-2 space-y-3">
          <div className="flex flex-col">
            <label htmlFor="first-name" className="text-sm">
              First Name
            </label>
            <input
              id="first-name"
              type="text"
              value={firstName || ""}
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                setFirstName(e.target.value)
              }
              placeholder="Enter your first name"
              className="px-2 py-1 bg-white dark:bg-surface-darker border border-brand-secondary dark:border-gray-600 rounded-lg text-text-base dark:text-text-inverted focus:outline-none focus:ring-2 focus:ring-brand-secondary"
            />
          </div>
          <div className="flex flex-col">
            <label htmlFor="last-name" className="text-sm">
              Last Name
            </label>
            <input
              id="last-name"
              type="text"
              value={lastName || ""}
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                setLastName(e.target.value)
              }
              placeholder="Enter your last name"
              className="px-2 py-1 bg-white dark:bg-surface-darker border border-brand-secondary dark:border-gray-600 rounded-lg text-text-base dark:text-text-inverted focus:outline-none focus:ring-2 focus:ring-brand-secondary"
            />
          </div>
          <div className="flex flex-col">
            <label htmlFor="username" className="text-sm">
              Username
            </label>
            <input
              id="username"
              type="text"
              value={username || ""}
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                setUsername(e.target.value)
              }
              readOnly={!isUsernameEditable}
              className={
                isUsernameEditable
                  ? "px-2 py-1 bg-white dark:bg-surface-darker border border-brand-secondary dark:border-gray-600 rounded-lg text-text-base dark:text-text-inverted focus:outline-none focus:ring-2 focus:ring-brand-secondary"
                  : "px-2 py-1 bg-muted dark:bg-gray-700 text-gray-500 dark:text-gray-400 border border-brand-secondary dark:border-gray-600 rounded-lg cursor-not-allowed focus:outline-none"
              }
              title={
                isUsernameEditable
                  ? "Username can be changed once"
                  : "Username cannot be changed"
              }
            />
            <span className="mt-1 text-xs text-text-muted dark:text-text-inverted">
              {isUsernameEditable
                ? "You can change this once. Choose carefully."
                : "Usernames are final once set."}
            </span>
          </div>
          <div className="flex flex-col relative">
            <label htmlFor="email" className="text-sm">
              Email
            </label>
            <input
              id="email"
              type="text"
              value={email}
              readOnly
              className="px-2 py-1 bg-muted dark:bg-gray-700 text-gray-500 dark:text-gray-400 border border-brand-secondary dark:border-gray-600 rounded-lg cursor-not-allowed focus:outline-none"
              title="This field is read-only"
            />
          </div>
        </div>
        <button
          onClick={handleUpdateProfile}
          className="mt-4 px-4 py-2 text-white bg-brand-primary hover:bg-brand-primary/90 dark:hover:bg-brand-primaryBorder rounded-lg transition-colors"
        >
          Save Changes
        </button>

        <div className="mt-8 pt-6 border-t border-red-300 dark:border-red-900">
          <h3 className="text-xl font-semibold mb-2 text-red-600 dark:text-red-400">
            Danger Zone
          </h3>
          <p className="text-sm text-text-muted dark:text-text-inverted mb-4">
            Permanently delete your account and all associated data. This action
            cannot be undone.
          </p>
          <button
            onClick={handleDeleteClick}
            className="px-4 py-2 text-white bg-red-600 hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-800 rounded-lg transition-colors"
          >
            Delete Account
          </button>
        </div>
      </div>

      {isDeleteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-surface-light dark:bg-surface-dark rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
            <h2 className="text-xl font-semibold text-text-base dark:text-text-inverted mb-4">
              Delete Account
            </h2>
            <p className="text-sm text-text-muted dark:text-text-inverted mb-4">
              This action is permanent and cannot be undone. All your data will
              be deleted, including shops, votes, and comments.
            </p>

            <div className="space-y-4">
              <div>
                <label
                  htmlFor="delete-confirm"
                  className="block text-sm font-medium text-text-base dark:text-text-inverted mb-2"
                >
                  Type <span className="font-bold">DELETE</span> to confirm:
                </label>
                <input
                  id="delete-confirm"
                  type="text"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-surface-darker border border-gray-300 dark:border-gray-600 rounded-lg text-text-base dark:text-text-inverted focus:outline-none focus:ring-2 focus:ring-brand-primary"
                  placeholder="DELETE"
                  disabled={isDeleting}
                />
              </div>

              {needsReauth && (
                <div>
                  <label
                    htmlFor="delete-password"
                    className="block text-sm font-medium text-text-base dark:text-text-inverted mb-2"
                  >
                    Password:
                  </label>
                  <input
                    id="delete-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-surface-darker border border-gray-300 dark:border-gray-600 rounded-lg text-text-base dark:text-text-inverted focus:outline-none focus:ring-2 focus:ring-brand-primary"
                    placeholder="Enter your password"
                    disabled={isDeleting}
                  />
                </div>
              )}

              {deleteError && (
                <div className="text-sm text-red-600 dark:text-red-400">
                  {deleteError}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={handleCloseModal}
                disabled={isDeleting}
                className="px-4 py-2 text-text-base dark:text-text-inverted bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                disabled={isDeleting || confirmText !== "DELETE"}
                className="px-4 py-2 text-white bg-red-600 hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-800 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isDeleting ? "Deleting..." : "Delete Permanently"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Account;
