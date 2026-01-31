import { createClient } from "@libsql/client";
import path from "path";
import { pathToFileURL } from "url";

const rawUrl = process.env.DATABASE_URL || process.env.TURSO_URL;
const rawAuthToken =
  process.env.DATABASE_AUTH_TOKEN || process.env.TURSO_AUTH_TOKEN;

if (!rawUrl) {
  throw new Error("DATABASE_URL or TURSO_URL must be set");
}

const isFileUrl = rawUrl.startsWith("file:");
const resolvedUrl = isFileUrl
  ? pathToFileURL(
      path.resolve(process.cwd(), rawUrl.replace(/^file:/, "")),
    ).toString()
  : rawUrl;

if (!isFileUrl && !rawAuthToken) {
  throw new Error("DATABASE_AUTH_TOKEN or TURSO_AUTH_TOKEN must be set");
}

const dbClient = createClient(
  isFileUrl ? { url: resolvedUrl } : { url: rawUrl, authToken: rawAuthToken },
);

// Module-level flag to ensure schema initialization runs only once
let initPromise = null;

/**
 * Initialize database schema for favorites and collections.
 * Only auto-runs in development. In production, requires manual migration.
 * Uses CREATE TABLE IF NOT EXISTS for idempotency.
 */
const initSchema = async () => {
  // Only auto-initialize in development
  const isDev =
    process.env.NODE_ENV !== "production" &&
    process.env.VERCEL_ENV !== "production";

  if (!isDev) {
    // In production, verify tables exist but don't create them
    try {
      await dbClient.execute({
        sql: "SELECT name FROM sqlite_master WHERE type='table' AND name='collections' LIMIT 1",
        args: [],
      });
    } catch (error) {
      console.error(
        "CRITICAL: Required database tables missing in production. " +
          "Please run migrations manually. Error:",
        error,
      );
      throw new Error(
        "Database schema not initialized. Contact administrator to apply migrations.",
      );
    }
    return;
  }

  console.warn(
    "[DEV] Auto-initializing database schema for collections and saved shops...",
  );

  try {
    // Create saved_shops table
    await dbClient.execute({
      sql: `
        CREATE TABLE IF NOT EXISTS saved_shops (
          user_id INTEGER NOT NULL,
          shop_id INTEGER NOT NULL,
          date_created TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (user_id, shop_id),
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
          FOREIGN KEY (shop_id) REFERENCES shops(id) ON DELETE CASCADE
        )
      `,
      args: [],
    });

    // Create indexes for saved_shops
    await dbClient.execute({
      sql: "CREATE INDEX IF NOT EXISTS idx_saved_shops_user ON saved_shops (user_id, date_created DESC)",
      args: [],
    });

    await dbClient.execute({
      sql: "CREATE INDEX IF NOT EXISTS idx_saved_shops_shop ON saved_shops (shop_id)",
      args: [],
    });

    // Create collections table
    await dbClient.execute({
      sql: `
        CREATE TABLE IF NOT EXISTS collections (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          name TEXT NOT NULL,
          description TEXT,
          visibility TEXT NOT NULL DEFAULT 'private',
          date_created TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          date_modified TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
      `,
      args: [],
    });

    // Create collection_shops junction table
    await dbClient.execute({
      sql: `
        CREATE TABLE IF NOT EXISTS collection_shops (
          collection_id INTEGER NOT NULL,
          shop_id INTEGER NOT NULL,
          sort_order INTEGER DEFAULT 0,
          date_created TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (collection_id, shop_id),
          FOREIGN KEY (collection_id) REFERENCES collections(id) ON DELETE CASCADE,
          FOREIGN KEY (shop_id) REFERENCES shops(id) ON DELETE CASCADE
        )
      `,
      args: [],
    });

    // Create indexes for collections
    await dbClient.execute({
      sql: "CREATE INDEX IF NOT EXISTS idx_collections_user ON collections(user_id, date_created DESC)",
      args: [],
    });

    await dbClient.execute({
      sql: "CREATE INDEX IF NOT EXISTS idx_collection_shops_collection ON collection_shops(collection_id, sort_order, date_created DESC)",
      args: [],
    });

    console.warn("[DEV] Schema initialization complete.");
  } catch (error) {
    console.error("[DEV] Failed to initialize schema:", error);
    throw error;
  }
};

/**
 * Ensures schema is initialized before executing queries.
 * Initialization only runs once per process lifecycle.
 */
const ensureSchema = async () => {
  if (!initPromise) {
    initPromise = initSchema();
  }
  await initPromise;
};

// Wrapped db client that ensures schema initialization
export const db = {
  execute: async (params) => {
    await ensureSchema();
    return dbClient.execute(params);
  },
};

export const executeQuery = async (sql, args = []) => {
  await ensureSchema();
  const result = await dbClient.execute({ sql, args });
  return result.rows;
};
