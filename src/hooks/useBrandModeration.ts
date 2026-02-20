import { useCallback, useEffect, useState } from "react";
import { useToast } from "@context/toastContext";
import {
  BrandAdminItem,
  BrandStatus,
  getBrands,
  getShopSubmissions,
  reviewShopSubmission,
  ShopSubmissionItem,
  updateBrandStatus,
} from "@services/brandModerationService";

export const useBrandModeration = () => {
  const { addToast } = useToast();

  const [brands, setBrands] = useState<BrandAdminItem[]>([]);
  const [submissions, setSubmissions] = useState<ShopSubmissionItem[]>([]);
  const [isLoadingBrands, setIsLoadingBrands] = useState(true);
  const [isLoadingSubmissions, setIsLoadingSubmissions] = useState(true);
  const [updatingBrandKey, setUpdatingBrandKey] = useState<string | null>(null);
  const [updatingSubmissionId, setUpdatingSubmissionId] = useState<
    number | null
  >(null);
  const [brandSearch, setBrandSearch] = useState("");
  const [brandStatusFilter, setBrandStatusFilter] = useState<
    BrandStatus | "all"
  >("all");

  const refreshBrands = useCallback(async () => {
    try {
      setIsLoadingBrands(true);
      const items = await getBrands(brandSearch, brandStatusFilter);
      setBrands(items);
    } catch (error) {
      console.error("Failed to fetch brands:", error);
      addToast("Failed to load brands.", "error");
    } finally {
      setIsLoadingBrands(false);
    }
  }, [addToast, brandSearch, brandStatusFilter]);

  const refreshSubmissions = useCallback(async () => {
    try {
      setIsLoadingSubmissions(true);
      const items = await getShopSubmissions("pending");
      setSubmissions(items);
    } catch (error) {
      console.error("Failed to fetch shop submissions:", error);
      addToast("Failed to load shop submissions.", "error");
    } finally {
      setIsLoadingSubmissions(false);
    }
  }, [addToast]);

  const refreshAll = useCallback(async () => {
    await Promise.all([refreshBrands(), refreshSubmissions()]);
  }, [refreshBrands, refreshSubmissions]);

  useEffect(() => {
    refreshAll().catch((error) =>
      console.error("Failed to refresh brand moderation data:", error),
    );
  }, [refreshAll]);

  const setBrandStatus = async (
    brandKey: string,
    status: BrandStatus,
    reason: string,
  ) => {
    try {
      setUpdatingBrandKey(brandKey);
      const response = await updateBrandStatus(brandKey, status, reason, true);
      addToast(
        `Brand updated to ${status}. ${response.affectedShops} shops affected.`,
        "success",
      );
      await refreshAll();
    } catch (error) {
      console.error("Failed to update brand status:", error);
      addToast("Failed to update brand status.", "error");
    } finally {
      setUpdatingBrandKey(null);
    }
  };

  const approveSubmission = async (
    submissionId: number,
    reviewNote?: string,
  ) => {
    try {
      setUpdatingSubmissionId(submissionId);
      const response = await reviewShopSubmission(
        submissionId,
        "approve",
        reviewNote,
      );
      addToast(
        response.shopId
          ? `Submission approved. Shop #${response.shopId} created.`
          : "Submission approved.",
        "success",
      );
      await refreshAll();
    } catch (error) {
      console.error("Failed to approve submission:", error);
      addToast("Failed to approve submission.", "error");
    } finally {
      setUpdatingSubmissionId(null);
    }
  };

  const rejectSubmission = async (
    submissionId: number,
    reviewNote?: string,
  ) => {
    try {
      setUpdatingSubmissionId(submissionId);
      await reviewShopSubmission(submissionId, "reject", reviewNote);
      addToast("Submission rejected.", "success");
      await refreshAll();
    } catch (error) {
      console.error("Failed to reject submission:", error);
      addToast("Failed to reject submission.", "error");
    } finally {
      setUpdatingSubmissionId(null);
    }
  };

  return {
    brands,
    submissions,
    isLoadingBrands,
    isLoadingSubmissions,
    updatingBrandKey,
    updatingSubmissionId,
    brandSearch,
    brandStatusFilter,
    setBrandSearch,
    setBrandStatusFilter,
    refreshBrands,
    refreshSubmissions,
    refreshAll,
    setBrandStatus,
    approveSubmission,
    rejectSubmission,
  };
};
