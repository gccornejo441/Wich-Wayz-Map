import {
  apiRequest,
  getAllCategories as fetchCategoriesApi,
} from "./apiClient";
import { Category } from "@models/Category";

export const checkCategoryExistsInDatabase = async (
  categoryName: string,
): Promise<boolean> => {
  const result = await apiRequest<{ exists: boolean }>(
    `/categories/exists?name=${encodeURIComponent(categoryName)}`,
  );
  return result.exists;
};

export const addCategoryToDatabase = async (
  categoryName: string,
  description: string,
): Promise<void> => {
  await apiRequest("/categories", {
    method: "POST",
    body: JSON.stringify({ categoryName, description }),
  });
};

export const fetchCategoriesFromDatabase = async (): Promise<Category[]> => {
  return apiRequest<Category[]>("/categories");
};

export const readCategoriesFromLocalStorage = (): Category[] => {
  const categories = localStorage.getItem("categories");
  return categories ? JSON.parse(categories) : [];
};

export const writeCategoriesToLocalStorage = (categories: Category[]): void => {
  localStorage.setItem("categories", JSON.stringify(categories));
};

/**
 * Synchronizes the local storage with the database.
 */
export const synchronizeLocalStorageWithDatabase = async (): Promise<void> => {
  const dbCategories = await fetchCategoriesFromDatabase();
  const localStorageCategories = readCategoriesFromLocalStorage();

  if (JSON.stringify(dbCategories) !== JSON.stringify(localStorageCategories)) {
    writeCategoriesToLocalStorage(dbCategories);
  }
};

/**
 * Adds a category to the database if it doesn't already exist.
 *
 * @param categoryName - The name of the category to add.
 * @param description - The description of the category.
 * @throws Will throw an error if the category already exists in the database.
 */
export const addCategoryIfNotExists = async (
  categoryName: string,
  description: string,
): Promise<void> => {
  await synchronizeLocalStorageWithDatabase();

  const categoryExistsInDatabase =
    await checkCategoryExistsInDatabase(categoryName);
  if (categoryExistsInDatabase) {
    throw new Error("Category already exists in the database");
  }

  await addCategoryToDatabase(categoryName, description);

  const categories = readCategoriesFromLocalStorage();
  const categoryExistsInLocalStorage = categories.some(
    (category) => category.category_name === categoryName,
  );

  if (!categoryExistsInLocalStorage) {
    categories.push({ category_name: categoryName, description });
    writeCategoriesToLocalStorage(categories);
  }
};

/**
 * Retrieves categories either from local storage or the database.
 *
 * This function first attempts to read categories from the local storage. If no categories are found,
 * it fetches them from the database and writes them back to local storage for future use. It also
 * validates the structure of the category data to ensure it contains the necessary fields.
 */
export const GetCategories = async (): Promise<Category[]> => {
  let categories = readCategoriesFromLocalStorage() as Category[];

  if (categories.length === 0) {
    categories = (await fetchCategoriesApi()) as Category[];
    writeCategoriesToLocalStorage(categories);
  }

  return categories;
};
