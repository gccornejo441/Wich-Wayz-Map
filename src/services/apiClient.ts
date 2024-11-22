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

export const fetchTableData = async <T>(tableName: string): Promise<T[]> => {
  const query = `SELECT * FROM ${tableName}`;
  const { rows } = await executeQuery<T>(query);
  return rows;
};

export const insertData = async (
  tableName: string,
  columns: string[],
  values: QueryParams,
): Promise<void> => {
  const placeholders = values.map(() => "?").join(", ");
  const query = `INSERT INTO ${tableName} (${columns.join(", ")}) VALUES (${placeholders})`;
  await executeQuery(query, values);
};
