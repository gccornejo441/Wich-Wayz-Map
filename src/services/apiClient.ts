import { createClient, Client, InStatement, InArgs } from "@libsql/client";
import { UserMetadata } from "../context/authContext";

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

export interface Category {
  id: number;
  category_name: string;
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

/**
 * Fetches the list of categories from a JSON file located at "/categories.json".
 */
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

/**
 * Updates data in the specified table.
 */
export const updateData = async (
  tableName: string,
  updates: Record<string, string | number | null>,
  condition: string,
  conditionArgs: QueryParams,
): Promise<void> => {
  const setClause = Object.keys(updates)
    .map((column) => `${column} = ?`)
    .join(", ");
  const query = `UPDATE ${tableName} SET ${setClause} WHERE ${condition}`;

  const args: InArgs = [...Object.values(updates), ...conditionArgs] as InArgs;

  await executeQuery(query, args);
};

/**
 * Updates the categories associated with a shop in the database.
 */
export const updateShopCategories = async (
  shopId: number,
  categoryIds: number[],
): Promise<void> => {
  const db = await tursoClient.transaction();

  try {
    const deleteStmt = {
      sql: `
        DELETE FROM shop_categories
        WHERE shop_id = $shop_id;
      `,
      args: { shop_id: shopId },
    };
    await db.execute(deleteStmt);

    const insertCategoryStmts = categoryIds.map((categoryId) => ({
      sql: `
        INSERT INTO shop_categories (shop_id, category_id)
        VALUES ($shop_id, $category_id);
      `,
      args: {
        shop_id: shopId,
        category_id: categoryId,
      },
    }));

    for (const stmt of insertCategoryStmts) {
      await db.execute(stmt);
    }

    await db.commit();
  } catch (error) {
    await db.rollback();
    console.error("Failed to update shop categories:", error);
    throw error;
  }
};

/**
 * Stores a new user in the users table.
 */
export const storeUser = async (userDetails: {
  firebaseUid: string;
  email: string;
  hashedPassword: string;
  username: string | null;
  firstName: string | null;
  lastName: string | null;
}) => {
  const { firebaseUid, email, hashedPassword, username, firstName, lastName } =
    userDetails;

  await insertData(
    "users",
    [
      "firebase_uid",
      "email",
      "hashed_password",
      "username",
      "first_name",
      "last_name",
    ],
    [firebaseUid, email, hashedPassword, username, firstName, lastName],
  );
};

interface UserRow {
  id: number;
  email: string;
  hashed_password: string;
  username: string | null;
  verified: boolean;
  verification_token: string | null;
  modified_by: string | null;
  date_created: string;
  date_modified: string;
  membership_status: string;
  first_name: string | null;
  last_name: string | null;
  role: string;
  account_status: string;
  last_login: string | null;
  avatar: string | null;
  token_expiry: string | null;
  reset_token: string | null;
  firebase_uid: string;
}

/**
 * Retrieves user data from Turso given their Firebase UID.
 */
export const getUser = async (
  firebaseUid: string,
): Promise<UserMetadata | null> => {
  const result = await executeQuery<UserRow>(
    `SELECT * FROM users WHERE firebase_uid = ?`,
    [firebaseUid],
  );

  if (!result.rows || !Array.isArray(result.rows) || result.rows.length === 0) {
    throw new Error("Invalid query result format");
  }

  const userRow = result.rows[0];
  const user: UserMetadata = {
    id: userRow.id,
    email: userRow.email,
    hashedPassword: userRow.hashed_password,
    username: userRow.username,
    verified: userRow.verified,
    verificationToken: userRow.verification_token,
    modifiedBy: userRow.modified_by,
    dateCreated: userRow.date_created,
    dateModified: userRow.date_modified,
    membershipStatus: userRow.membership_status,
    firstName: userRow.first_name,
    lastName: userRow.last_name,
    role: userRow.role,
    accountStatus: userRow.account_status,
    lastLogin: userRow.last_login,
    avatar: userRow.avatar,
    tokenExpiry: userRow.token_expiry,
    resetToken: userRow.reset_token,
    firebaseUid: userRow.firebase_uid,
  };

  return user;
};

export const updateMembershipStatus = async (
  userId: string | number,
  status: string,
): Promise<void> => {
  console.log(`Updating membership for user ${userId} to status ${status}`);

  try {
    await updateData(
      "users",
      { membership_status: status },
      "id = ?",
      [userId],
    );
    console.log(`Membership status updated successfully for user ${userId}`);
  } catch (error) {
    console.error(
      `Failed to update membership status for user ${userId}:`,
      error,
    );
    throw error;
  }
};
