/**
 * Bulk Shop Submission Service
 * Handles submitting multiple shops via the existing add-new-shop endpoint
 */

import { authApiRequest } from "./apiClient";
import { GetCategories } from "./categoryService";
import type { CsvShopRow } from "@/utils/csvParser";

export interface BulkUploadResult {
  success: number;
  failed: number;
  results: ShopSubmissionResult[];
}

export interface ShopSubmissionResult {
  rowNumber: number;
  shopName: string;
  success: boolean;
  shopId?: number;
  locationId?: number;
  error?: string;
  status?: "pending_review";
}

/**
 * Convert CSV row to API payload format
 */
const csvRowToPayload = async (row: CsvShopRow) => {
  // Get categories to map names to IDs
  const categories = await GetCategories();
  const categoryNames = row.categories
    .split(",")
    .map((c) => c.trim().toLowerCase());

  const categoryIds = categoryNames
    .map((name) => {
      const category = categories.find(
        (c) => c.category_name.toLowerCase() === name,
      );
      return category?.id;
    })
    .filter((id): id is number => typeof id === "number");

  if (categoryIds.length === 0) {
    throw new Error(
      `No valid categories found. Available: ${categories.map((c) => c.category_name).join(", ")}`,
    );
  }

  return {
    shopName: row.shop_name.trim(),
    shop_description: row.shop_description.trim(),
    address_first: row.address.trim(),
    address_second: row.address_second?.trim() || "",
    house_number: "",
    city: row.city.trim(),
    state: row.state.toUpperCase().trim(),
    postcode: row.zip.replace(/\D/g, ""),
    country: row.country?.toUpperCase().trim() || "US",
    latitude: Number(row.latitude),
    longitude: Number(row.longitude),
    phone: row.phone?.trim() || "",
    website_url: row.website_url?.trim() || "",
    chain_attestation: String(row.chain_attestation).toLowerCase(),
    estimated_location_count: String(
      row.estimated_location_count,
    ).toLowerCase(),
    eligibility_confirmed:
      String(row.eligibility_confirmed).toLowerCase() === "true",
    selectedCategoryIds: categoryIds,
  };
};

/**
 * Submit a single shop
 */
const submitSingleShop = async (
  row: CsvShopRow,
  rowNumber: number,
): Promise<ShopSubmissionResult> => {
  try {
    const payload = await csvRowToPayload(row);

    const response = await authApiRequest<{
      shopId?: number;
      locationId?: number;
      status?: "pending_review";
      message?: string;
    }>("/add-new-shop", {
      method: "POST",
      body: JSON.stringify(payload),
    });

    if (response.status === "pending_review") {
      return {
        rowNumber,
        shopName: row.shop_name,
        success: true,
        status: "pending_review",
        error: response.message || "Submission queued for admin review",
      };
    }

    return {
      rowNumber,
      shopName: row.shop_name,
      success: true,
      shopId: response.shopId,
      locationId: response.locationId,
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";

    return {
      rowNumber,
      shopName: row.shop_name,
      success: false,
      error: errorMessage,
    };
  }
};

/**
 * Submit multiple shops sequentially
 * @param rows - Array of CSV shop rows to submit
 * @param onProgress - Optional callback for progress updates
 */
export const submitBulkShops = async (
  rows: CsvShopRow[],
  onProgress?: (
    current: number,
    total: number,
    result: ShopSubmissionResult,
  ) => void,
): Promise<BulkUploadResult> => {
  const results: ShopSubmissionResult[] = [];
  let successCount = 0;
  let failedCount = 0;

  for (let i = 0; i < rows.length; i++) {
    const result = await submitSingleShop(rows[i], i + 2); // +2 for header and 0-index
    results.push(result);

    if (result.success) {
      successCount++;
    } else {
      failedCount++;
    }

    if (onProgress) {
      onProgress(i + 1, rows.length, result);
    }

    // Small delay to avoid overwhelming the server
    if (i < rows.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }

  return {
    success: successCount,
    failed: failedCount,
    results,
  };
};
