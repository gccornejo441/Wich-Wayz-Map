import { authApiRequest } from "./apiClient";

export type BrandStatus = "unknown" | "allowed" | "blocked" | "needs_review";
export type SubmissionStatus = "pending" | "approved" | "rejected";
export type SubmissionDecision = "approve" | "reject";

export interface BrandAdminItem {
  brandKey: string;
  displayName: string;
  status: BrandStatus;
  knownLocationCount: number | null;
  lastChainScore: number | null;
  activeShopCount: number;
  updatedAt?: string;
}

export interface ShopSubmissionItem {
  id: number;
  submittedByUserId: number;
  submittedByEmail: string | null;
  submittedAt: string;
  status: SubmissionStatus;
  brandKey: string | null;
  chainScore: number;
  signals: Record<string, unknown> | null;
  payload: Record<string, unknown> | null;
  reviewedByUserId: number | null;
  reviewedByEmail: string | null;
  reviewedAt: string | null;
  reviewNote: string | null;
  approvedShopId: number | null;
}

export const getBrands = async (
  search?: string,
  status?: BrandStatus | "all",
) => {
  const params = new URLSearchParams();
  if (search?.trim()) params.set("search", search.trim());
  if (status && status !== "all") params.set("status", status);

  const query = params.toString();
  const response = await authApiRequest<{ items: BrandAdminItem[] }>(
    `/brands${query ? `?${query}` : ""}`,
  );
  return response.items;
};

export const updateBrandStatus = async (
  brandKey: string,
  status: BrandStatus,
  reason?: string,
  applyRetroactive: boolean = true,
) => {
  const encodedBrandKey = encodeURIComponent(brandKey);
  return authApiRequest<{
    brandKey: string;
    status: BrandStatus;
    affectedShops: number;
    applyRetroactive: boolean;
  }>(`/brands/${encodedBrandKey}`, {
    method: "PATCH",
    body: JSON.stringify({
      status,
      reason: reason?.trim() || undefined,
      applyRetroactive,
    }),
  });
};

export const getShopSubmissions = async (
  status: SubmissionStatus = "pending",
) => {
  const response = await authApiRequest<{ items: ShopSubmissionItem[] }>(
    `/submissions?status=${status}`,
  );
  return response.items;
};

export const reviewShopSubmission = async (
  submissionId: number,
  decision: SubmissionDecision,
  reviewNote?: string,
) => {
  return authApiRequest<{
    id: number;
    status: SubmissionStatus;
    shopId?: number;
    locationId?: number;
    brandKey?: string;
  }>(`/submissions/${submissionId}`, {
    method: "PATCH",
    body: JSON.stringify({
      decision,
      reviewNote: reviewNote?.trim() || undefined,
    }),
  });
};
