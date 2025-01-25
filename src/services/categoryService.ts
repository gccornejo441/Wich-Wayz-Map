import fs from "fs";
import path from "path";
import { executeQuery, insertData } from "./apiClient";

export interface CategoryDescription {
  category_name: string;
  description: string;
}

export const checkCategoryExistsInDatabase = async (
  categoryName: string,
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
  description: string,
): Promise<void> => {
  await insertData(
    "categories",
    ["category_name", "description"],
    [categoryName, description],
  );
};

export const readCategoriesFromFile = (): CategoryDescription[] => {
  const categoriesFilePath = path.join(
    process.cwd(),
    "public",
    "categories.json",
  );
  if (!fs.existsSync(categoriesFilePath)) {
    return [];
  }
  const fileContent = fs.readFileSync(categoriesFilePath, "utf-8");
  return JSON.parse(fileContent);
};

export const checkCategoryExistsInFile = (
  categories: CategoryDescription[],
  categoryName: string,
): boolean => {
  return categories.some((category) => category.category_name === categoryName);
};

export const addCategoryToFile = (
  categories: CategoryDescription[],
  categoryName: string,
  description: string,
): void => {
  const categoriesFilePath = path.join(
    process.cwd(),
    "public",
    "categories.json",
  );
  categories.push({ category_name: categoryName, description });
  fs.writeFileSync(
    categoriesFilePath,
    JSON.stringify(categories, null, 2),
    "utf-8",
  );
};

export const addCategoryIfNotExists = async (
  categoryName: string,
  description: string,
): Promise<void> => {
  const categoryExistsInDatabase =
    await checkCategoryExistsInDatabase(categoryName);
  if (categoryExistsInDatabase) {
    throw new Error("Category already exists in the database");
  }

  await addCategoryToDatabase(categoryName, description);

  const categories = readCategoriesFromFile();
  const categoryExistsInFile = checkCategoryExistsInFile(
    categories,
    categoryName,
  );

  if (!categoryExistsInFile) {
    addCategoryToFile(categories, categoryName, description);
  }
};
