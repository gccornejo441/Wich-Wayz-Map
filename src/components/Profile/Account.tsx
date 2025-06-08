import { ChangeEvent } from "react";
import { Callback } from "../../types/dataTypes";

export interface AccountProps {
  email: string;
  firstName: string;
  setFirstName: (value: string) => void;
  lastName: string;
  setLastName: (value: string) => void;
  username: string;
  setUsername: (value: string) => void;
  handleUpdateProfile: Callback;
}

const Account = ({
  firstName,
  setFirstName,
  lastName,
  setLastName,
  username,
  setUsername,
  email,
  handleUpdateProfile,
}: AccountProps) => {
  return (
    <div className="p-6 mx-auto bg-surface-light dark:bg-surface-dark text-text-base dark:text-text-inverted pb-4">
      <h3 className="text-xl font-semibold mb-2">Profile Information</h3>
      <div className="mt-2 space-y-3">
        <div className="flex flex-col">
          <label className="text-sm">First Name</label>
          <input
            type="text"
            value={firstName}
            onChange={(e: ChangeEvent<HTMLInputElement>) =>
              setFirstName(e.target.value)
            }
            className="px-2 py-1 bg-white dark:bg-surface-darker border border-brand-secondary dark:border-gray-600 rounded-lg text-text-base dark:text-text-inverted"
          />
        </div>
        <div className="flex flex-col">
          <label className="text-sm">Last Name</label>
          <input
            type="text"
            value={lastName}
            onChange={(e: ChangeEvent<HTMLInputElement>) =>
              setLastName(e.target.value)
            }
            className="px-2 py-1 bg-white dark:bg-surface-darker border border-brand-secondary dark:border-gray-600 rounded-lg text-text-base dark:text-text-inverted"
          />
        </div>
        <div className="flex flex-col">
          <label className="text-sm">Username</label>
          <input
            type="text"
            value={username}
            onChange={(e: ChangeEvent<HTMLInputElement>) =>
              setUsername(e.target.value)
            }
            className="px-2 py-1 bg-white dark:bg-surface-darker border border-brand-secondary dark:border-gray-600 rounded-lg text-text-base dark:text-text-inverted"
          />
        </div>
        <div className="flex flex-col relative">
          <label className="text-sm">Email</label>
          <input
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
    </div>
  );
};

export default Account;
