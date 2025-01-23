import { renderHook, act } from "@testing-library/react";
import { Mock, vi } from "vitest";
import { useToast } from "../../src/context/toastContext";
import { useAdminPage } from "../../src/hooks/useAdminPage";
import { addCategoryIfNotExists } from "../../src/services/apiClient";

vi.mock("@services/apiClient", () => ({
  addCategoryIfNotExists: vi.fn(),
  getAllUsers: vi.fn(),
}));

vi.mock("@context/toastContext", () => ({
  useToast: vi.fn(),
}));

describe("useAdminPage - handleAddCategory", () => {
  let addToastMock: Mock;

  beforeEach(() => {
    addToastMock = vi.fn();
    (useToast as Mock).mockReturnValue({ addToast: addToastMock });
    vi.clearAllMocks();
  });

  it("should add a category successfully when input is valid", async () => {
    (addCategoryIfNotExists as Mock).mockResolvedValueOnce({ success: true });

    const { result } = renderHook(() => useAdminPage());

    await act(async () => {
      await result.current.handleAddCategory(
        "New Category",
        "This is a description",
      );
    });

    expect(addCategoryIfNotExists).toHaveBeenCalledWith(
      "New Category",
      "This is a description",
    );
    expect(addToastMock).toHaveBeenCalledWith(
      "Category added successfully!",
      "success",
    );
    expect(result.current.validationErrors).toEqual([]);
  });

  it("should handle multiple category additions successfully", async () => {
    (addCategoryIfNotExists as Mock).mockResolvedValue({ success: true });

    const { result } = renderHook(() => useAdminPage());

    const categories = Array.from(
      { length: 100 },
      (_, i) => `Category ${i + 1}`,
    );

    for (const category of categories) {
      await act(async () => {
        await result.current.handleAddCategory(
          category,
          `Description for ${category}`,
        );
      });

      expect(addCategoryIfNotExists).toHaveBeenCalledWith(
        category,
        `Description for ${category}`,
      );
    }

    expect(addToastMock).toHaveBeenCalledTimes(100);
  });

  it("should handle validation errors when input is empty", async () => {
    const { result } = renderHook(() => useAdminPage());

    await act(async () => {
      await result.current.handleAddCategory("", "");
    });

    expect(result.current.validationErrors).toEqual([
      "Category name cannot be empty",
    ]);
    expect(addToastMock).not.toHaveBeenCalled();
    expect(addCategoryIfNotExists).not.toHaveBeenCalled();
  });

  it("should handle API call failure", async () => {
    (addCategoryIfNotExists as Mock).mockRejectedValueOnce(
      new Error("Network Error"),
    );

    const { result } = renderHook(() => useAdminPage());

    await act(async () => {
      await result.current.handleAddCategory(
        "Test Category",
        "Test Description",
      );
    });

    expect(addToastMock).toHaveBeenCalledWith(
      "Failed to add category: Network Error",
      "error",
    );
  });

  it("should handle CategoryExistsError", async () => {
    const error = new Error("Category already exists!");
    error.name = "CategoryExistsError";
    (addCategoryIfNotExists as Mock).mockRejectedValueOnce(error);

    const { result } = renderHook(() => useAdminPage());

    await act(async () => {
      await result.current.handleAddCategory(
        "Existing Category",
        "Existing Description",
      );
    });

    expect(addToastMock).toHaveBeenCalledWith(
      "Category already exists!",
      "error",
    );
  });

  it("should handle unknown errors", async () => {
    (addCategoryIfNotExists as Mock).mockRejectedValueOnce("Unknown error");

    const { result } = renderHook(() => useAdminPage());

    await act(async () => {
      await result.current.handleAddCategory(
        "Test Category",
        "Test Description",
      );
    });

    expect(addToastMock).toHaveBeenCalledWith(
      "An unknown error occurred",
      "error",
    );
  });
});
