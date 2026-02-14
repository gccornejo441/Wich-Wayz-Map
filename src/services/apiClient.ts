import { UserMetadata } from "@context/authContext";
import { SafeUserMetadata } from "@models/SafeUserMetadata";
import { Category } from "@models/Category";
import { getIdToken } from "firebase/auth";
import { auth } from "./firebase";

type ApiError = Error & { status?: number };

const apiBase = (import.meta.env.VITE_API_BASE as string | undefined) ?? "/api";

const buildUrl = (path: string) => {
  const normalizedBase = apiBase.endsWith("/") ? apiBase.slice(0, -1) : apiBase;
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${normalizedBase}${normalizedPath}`;
};

export const getAuthHeaders = async (): Promise<Record<string, string>> => {
  const user = auth.currentUser;
  if (!user) {
    throw new Error("Not authenticated");
  }

  const idToken = await getIdToken(user, true);
  return {
    Authorization: `Bearer ${idToken}`,
    "Content-Type": "application/json",
  };
};

export const apiRequest = async <T>(
  path: string,
  options: RequestInit = {},
): Promise<T> => {
  const headers = new Headers(options.headers || {});
  headers.set("Accept", "application/json");

  if (options.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(buildUrl(path), { ...options, headers });

  if (!response.ok) {
    let message = `Request failed with status ${response.status}`;
    try {
      const data = await response.json();
      if (data?.message || data?.error) {
        message = data.message || data.error;
      }
    } catch (parseError) {
      console.error("Failed to parse error response", parseError);
    }

    const error: ApiError = new Error(message);
    error.status = response.status;
    throw error;
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
};

export const authApiRequest = async <T>(
  path: string,
  options: RequestInit = {},
): Promise<T> => {
  const authHeaders = await getAuthHeaders();

  return apiRequest<T>(path, {
    ...options,
    headers: {
      ...authHeaders,
      ...options.headers,
    },
  });
};

export const getLocationCount = async (): Promise<number> => {
  const result = await apiRequest<{ count: number }>("/locations/count");
  return result.count;
};

export const getAllCategories = async (): Promise<Category[]> => {
  return apiRequest<Category[]>("/categories");
};

export const getMyUserMetadata = async (): Promise<SafeUserMetadata> => {
  return authApiRequest<SafeUserMetadata>("/users/me");
};

export const storeUser = async (userDetails: {
  firebaseUid: string;
  email: string;
  hashedPassword: string;
  username?: string;
  membershipStatus: string;
  firstName: string | null;
  lastName: string | null;
}) => {
  return apiRequest<UserMetadata>("/users", {
    method: "POST",
    body: JSON.stringify(userDetails),
  });
};

export const getUserById = async (
  userId: number,
): Promise<UserMetadata | null> => {
  try {
    return await apiRequest<UserMetadata>(`/users/${userId}`);
  } catch (error) {
    if ((error as ApiError).status === 404) {
      return null;
    }
    throw error;
  }
};

export const updateMembershipStatus = async (
  userId: number,
  status: string,
) => {
  await apiRequest(`/users/${userId}`, {
    method: "PATCH",
    body: JSON.stringify({ membershipStatus: status }),
  });
};

export const updateUserProfile = async (
  userId: number,
  updates: Record<string, unknown>,
) => {
  await apiRequest(`/users/${userId}`, {
    method: "PATCH",
    body: JSON.stringify(updates),
  });
};

export const getAllUsers = async (): Promise<UserMetadata[]> => {
  return apiRequest<UserMetadata[]>("/users");
};

export const updateUserRole = async (userId: number, role: string) => {
  await apiRequest(`/users/${userId}`, {
    method: "PATCH",
    body: JSON.stringify({ role }),
  });
};

export const deleteUserAccount = async (userId: number) => {
  await apiRequest(`/users/${userId}`, {
    method: "DELETE",
  });
};
