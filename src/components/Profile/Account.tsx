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
    <div className="p-6 mx-auto bg-background pb-4">
      <h3 className="text-xl font-semibold text-dark mb-2">
        Profile Information
      </h3>
      <div className="mt-2 space-y-3">
        <div className="flex flex-col">
          <label className="text-sm text-dark">First Name</label>
          <input
            type="text"
            value={firstName}
            onChange={(e: ChangeEvent<HTMLInputElement>) =>
              setFirstName(e.target.value)
            }
            className="px-2 py-1 border border-secondary rounded-lg"
          />
        </div>
        <div className="flex flex-col">
          <label className="text-sm text-dark">Last Name</label>
          <input
            type="text"
            value={lastName}
            onChange={(e: ChangeEvent<HTMLInputElement>) =>
              setLastName(e.target.value)
            }
            className="px-2 py-1 border border-secondary rounded-lg"
          />
        </div>
        <div className="flex flex-col">
          <label className="text-sm text-dark">Username</label>
          <input
            type="text"
            value={username}
            onChange={(e: ChangeEvent<HTMLInputElement>) =>
              setUsername(e.target.value)
            }
            className="px-2 py-1 border border-secondary rounded-lg"
          />
        </div>
        <div className="flex flex-col relative">
          <label className="text-sm text-dark">Email</label>
          <input
            type="text"
            value={email}
            readOnly
            className="px-2 py-1 border border-secondary rounded-lg bg-gray-200 text-gray-500 cursor-not-allowed focus:outline-none"
            title="This field is read-only"
          />
        </div>
      </div>
      <button
        onClick={handleUpdateProfile}
        className="mt-4 px-4 py-2 text-white bg-primary rounded-lg hover:bg-secondary transition-colors"
      >
        Save Changes
      </button>
    </div>
  );
};

export default Account;
