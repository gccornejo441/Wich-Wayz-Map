import { apiRequest } from "@services/apiClient";
import { PublicUserProfile } from "@models/PublicUserProfile";

export const getPublicUserProfile = async (
  username: string,
): Promise<PublicUserProfile> => {
  try {
    return await apiRequest<PublicUserProfile>(
      `/profiles/${encodeURIComponent(username)}`,
    );
  } catch (error) {
    console.error("Failed to load public profile:", error);
    throw new Error("Could not load profile");
  }
};
