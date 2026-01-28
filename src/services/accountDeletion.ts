import { auth } from "./firebase";
import {
  EmailAuthProvider,
  reauthenticateWithCredential,
  deleteUser as firebaseDeleteUser,
} from "firebase/auth";

export class RequiresRecentLoginError extends Error {
  constructor(message = "Recent authentication required") {
    super(message);
    this.name = "RequiresRecentLoginError";
  }
}

export const reauthWithPassword = async (password: string): Promise<void> => {
  const user = auth.currentUser;
  if (!user || !user.email) {
    throw new Error("No authenticated user found");
  }

  const credential = EmailAuthProvider.credential(user.email, password);
  await reauthenticateWithCredential(user, credential);
};

export const deleteAccountCallable = async (userId: number): Promise<void> => {
  const response = await fetch("/api/delete-account", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ userId }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    if (
      errorData.code === "unauthenticated" ||
      errorData.message?.includes("recent")
    ) {
      throw new RequiresRecentLoginError(errorData.message);
    }
    throw new Error(errorData.message || "Failed to delete account");
  }

  return response.json();
};

export const deleteAccountAndSignOut = async (
  userId: number,
): Promise<void> => {
  await deleteAccountCallable(userId);

  const user = auth.currentUser;
  if (user) {
    await firebaseDeleteUser(user);
  }
};
