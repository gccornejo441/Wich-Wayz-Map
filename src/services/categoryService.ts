import { executeQuery, insertData } from "./apiClient";

export interface Category {
  id?: number;
  category_name: string;
  description?: string;
}

export const checkCategoryExistsInDatabase = async (
  categoryName: string
): Promise<boolean> => {
  const checkQuery =
    "SELECT COUNT(*) as count FROM categories WHERE category_name = ?";
  const { rows: existing } = await executeQuery<{ count: number }>(checkQuery, [
    categoryName,
  ]);
  return existing[0].count > 0;
};

export const addCategoryToDatabase = async (
  categoryName: string,
  description: string
): Promise<void> => {
  await insertData(
    "categories",
    ["category_name", "description"],
    [categoryName, description]
  );
};

export const fetchCategoriesFromDatabase = async (): Promise<Category[]> => {
  const query = "SELECT category_name, description FROM categories";
  const { rows } = await executeQuery<Category>(query);
  return rows;
};

export const readCategoriesFromLocalStorage = (): Category[] => {
  const categories = localStorage.getItem("categories");
  return categories ? JSON.parse(categories) : [];
};

export const writeCategoriesToLocalStorage = (categories: Category[]): void => {
  localStorage.setItem("categories", JSON.stringify(categories));
};

export const synchronizeLocalStorageWithDatabase = async (): Promise<void> => {
  const dbCategories = await fetchCategoriesFromDatabase();
  const localStorageCategories = readCategoriesFromLocalStorage();

  if (JSON.stringify(dbCategories) !== JSON.stringify(localStorageCategories)) {
    console.log("Local storage is outdated. Updating from database...");
    writeCategoriesToLocalStorage(dbCategories);
  }
};

export const addCategoryIfNotExists = async (
  categoryName: string,
  description: string
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
    (category) => category.category_name === categoryName
  );

  if (!categoryExistsInLocalStorage) {
    categories.push({ category_name: categoryName, description });
    writeCategoriesToLocalStorage(categories);
    console.log("Category added to local storage successfully!");
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
  let categories = readCategoriesFromLocalStorage();

  if (categories.length === 0) {
    console.log("No categories in local storage. Fetching from database...");
    categories = await fetchCategoriesFromDatabase();

    writeCategoriesToLocalStorage(categories);
  }

  // 4. Validate the categories data
  if (
    !Array.isArray(categories) ||
    !categories.every(
      (item) =>
        "id" in item &&
        "category_name" in item &&
        ("description" in item || item.description === undefined)
    )
  ) {
    throw new Error("Invalid category data format");
  }

  return categories;
};