import { createClient, Client, InStatement, InArgs } from "@libsql/client";

const TURSO_URL = import.meta.env.VITE_TURSO_URL as string;
const TURSO_AUTH_TOKEN = import.meta.env.VITE_TURSO_AUTH_TOKEN as string;

export const tursoClient: Client = createClient({
  url: TURSO_URL,
  authToken: TURSO_AUTH_TOKEN,
});

type QueryParams = (string | number | null)[];
interface QueryResult<T> {
  rows: T[];
}

/**
 * Checks if the provided JWT token is valid based on its expiration time.
 */
const isTokenValid = (authToken: string): boolean => {
  try {
    const payload = JSON.parse(atob(authToken.split(".")[1]));
    const currentTime = Math.floor(Date.now() / 1000);
    return payload.exp > currentTime;
  } catch (e) {
    console.error("Invalid token format:", e);
    return false;
  }
};

if (!isTokenValid(TURSO_AUTH_TOKEN)) {
  console.warn(
    "Turso authToken is expired or invalid. Please refresh your credentials.",
  );
  throw new Error("Invalid Turso authToken");
}

/**
 * Executes a SQL query against the Turso database.
 */
export const executeQuery = async <T>(
  sql: string,
  args: InArgs = [],
): Promise<QueryResult<T>> => {
  try {
    const stmt: InStatement = { sql, args };
    const result = await tursoClient.execute(stmt);
    return { rows: result.rows as T[] };
  } catch (error) {
    console.error("Error executing query:", error);
    throw error;
  }
};

/**
 * Retrieves all rows from the specified table.
 */
export const fetchTableData = async <T>(tableName: string): Promise<T[]> => {
  const query = `SELECT * FROM ${tableName}`;
  const { rows } = await executeQuery<T>(query);
  return rows;
};

/**
 * Inserts a row of data into the specified table.
 */
export const insertData = async (
  tableName: string,
  columns: string[],
  values: QueryParams,
): Promise<void> => {
  const placeholders = values.map(() => "?").join(", ");
  const query = `INSERT INTO ${tableName} (${columns.join(", ")}) VALUES (${placeholders})`;
  await executeQuery(query, values);
};

export interface Category {
  id: number;
  category_name: string;
}

export const GetCategories = async (): Promise<Category[]> => {
  const response = await fetch("/categories.json");

  if (!response.ok) {
    throw new Error(`Failed to fetch categories: ${response.statusText}`);
  }

  const data: Category[] = await response.json();

  if (
    !Array.isArray(data) ||
    !data.every((item) => "id" in item && "category_name" in item)
  ) {
    throw new Error("Invalid category data format");
  }

  return data;
};
