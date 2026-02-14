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

const tableExists = async (tableName) => {
  const result = await dbClient.execute({
    sql: "SELECT name FROM sqlite_master WHERE type = 'table' AND name = ? LIMIT 1",
    args: [tableName],
  });

  return Array.isArray(result.rows) && result.rows.length > 0;
};

const getTableColumns = async (tableName) => {
  const result = await dbClient.execute({
    sql: `PRAGMA table_info(${tableName})`,
    args: [],
  });

  return new Set(result.rows.map((row) => String(row.name)));
};

const ensureColumn = async ({ tableName, columnName, columnDefinition }) => {
  const exists = await tableExists(tableName);
  if (!exists) return;

  const columns = await getTableColumns(tableName);
  if (columns.has(columnName)) return;

  await dbClient.execute({
    sql: `ALTER TABLE ${tableName} ADD COLUMN ${columnDefinition}`,
    args: [],
  });
};

/**
 * Initialize database schema for favorites, collections, reports, and moderation audit.
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

  console.warn("[DEV] Auto-initializing database schema...");

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

    // Create comment_reactions table
    await dbClient.execute({
      sql: `
        CREATE TABLE IF NOT EXISTS comment_reactions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          comment_id INTEGER NOT NULL,
          user_id INTEGER NOT NULL,
          reaction_type TEXT NOT NULL CHECK (
            reaction_type IN ('like', 'love', 'care', 'haha', 'wow', 'angry', 'sad')
          ),
          date_created TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          date_modified TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE (comment_id, user_id),
          FOREIGN KEY (comment_id) REFERENCES comments(id) ON DELETE CASCADE,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
      `,
      args: [],
    });

    await dbClient.execute({
      sql: "CREATE INDEX IF NOT EXISTS idx_comment_reactions_comment_type ON comment_reactions(comment_id, reaction_type)",
      args: [],
    });

    await dbClient.execute({
      sql: "CREATE INDEX IF NOT EXISTS idx_comment_reactions_user ON comment_reactions(user_id, date_created DESC)",
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

    // Create shop_reports table
    await dbClient.execute({
      sql: `
        CREATE TABLE IF NOT EXISTS shop_reports (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          shop_id INTEGER NOT NULL,
          reporter_user_id INTEGER NOT NULL,
          reason TEXT NOT NULL CHECK (
            reason IN ('spam', 'wrong_location', 'closed', 'duplicate')
          ),
          details TEXT,
          moderator_outcome TEXT NOT NULL DEFAULT 'needs_more_information' CHECK (
            moderator_outcome IN ('action_taken', 'no_action_needed', 'needs_more_information')
          ),
          moderation_actions TEXT NOT NULL,
          report_status TEXT NOT NULL DEFAULT 'open' CHECK (
            report_status IN ('open', 'reviewed', 'resolved', 'dismissed')
          ),
          date_created TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          date_modified TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (shop_id) REFERENCES shops(id) ON DELETE CASCADE,
          FOREIGN KEY (reporter_user_id) REFERENCES users(id) ON DELETE CASCADE
        )
      `,
      args: [],
    });

    await dbClient.execute({
      sql: "CREATE INDEX IF NOT EXISTS idx_shop_reports_shop ON shop_reports(shop_id, date_created DESC)",
      args: [],
    });

    await dbClient.execute({
      sql: "CREATE INDEX IF NOT EXISTS idx_shop_reports_reporter ON shop_reports(reporter_user_id, date_created DESC)",
      args: [],
    });

    await dbClient.execute({
      sql: "CREATE INDEX IF NOT EXISTS idx_shop_reports_status ON shop_reports(report_status, moderator_outcome)",
      args: [],
    });

    await ensureColumn({
      tableName: "shops",
      columnName: "content_status",
      columnDefinition:
        "content_status TEXT NOT NULL DEFAULT 'active' CHECK (content_status IN ('active', 'hidden', 'duplicate'))",
    });

    await ensureColumn({
      tableName: "users",
      columnName: "deleted_at",
      columnDefinition: "deleted_at TIMESTAMP",
    });

    await ensureColumn({
      tableName: "shops",
      columnName: "duplicate_of_shop_id",
      columnDefinition:
        "duplicate_of_shop_id INTEGER REFERENCES shops(id) ON DELETE SET NULL",
    });

    await dbClient.execute({
      sql: "CREATE INDEX IF NOT EXISTS idx_shops_content_status ON shops(content_status)",
      args: [],
    });

    await dbClient.execute({
      sql: "CREATE INDEX IF NOT EXISTS idx_shops_duplicate_of ON shops(duplicate_of_shop_id)",
      args: [],
    });

    await ensureColumn({
      tableName: "shop_reports",
      columnName: "location_id",
      columnDefinition:
        "location_id INTEGER REFERENCES locations(id) ON DELETE SET NULL",
    });

    await ensureColumn({
      tableName: "shop_reports",
      columnName: "duplicate_shop_id",
      columnDefinition:
        "duplicate_shop_id INTEGER REFERENCES shops(id) ON DELETE SET NULL",
    });

    await ensureColumn({
      tableName: "shop_reports",
      columnName: "suggested_latitude",
      columnDefinition: "suggested_latitude REAL",
    });

    await ensureColumn({
      tableName: "shop_reports",
      columnName: "suggested_longitude",
      columnDefinition: "suggested_longitude REAL",
    });

    await ensureColumn({
      tableName: "shop_reports",
      columnName: "resolved_by",
      columnDefinition:
        "resolved_by INTEGER REFERENCES users(id) ON DELETE SET NULL",
    });

    await ensureColumn({
      tableName: "shop_reports",
      columnName: "resolved_at",
      columnDefinition: "resolved_at TIMESTAMP",
    });

    await dbClient.execute({
      sql: "CREATE INDEX IF NOT EXISTS idx_shop_reports_queue ON shop_reports(report_status, reason, date_created DESC)",
      args: [],
    });

    await dbClient.execute({
      sql: "CREATE INDEX IF NOT EXISTS idx_shop_reports_resolved_by ON shop_reports(resolved_by, resolved_at DESC)",
      args: [],
    });

    await dbClient.execute({
      sql: "CREATE INDEX IF NOT EXISTS idx_shop_reports_duplicate_target ON shop_reports(duplicate_shop_id)",
      args: [],
    });

    await dbClient.execute({
      sql: "CREATE UNIQUE INDEX IF NOT EXISTS ux_shop_reports_open_by_target ON shop_reports(reporter_user_id, shop_id, IFNULL(location_id, -1), reason) WHERE report_status IN ('open', 'reviewed')",
      args: [],
    });

    await dbClient.execute({
      sql: `
        CREATE TABLE IF NOT EXISTS report_actions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          report_id INTEGER NOT NULL,
          moderator_user_id INTEGER,
          action_type TEXT NOT NULL,
          action_payload TEXT,
          notes TEXT,
          date_created TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (report_id) REFERENCES shop_reports(id) ON DELETE CASCADE,
          FOREIGN KEY (moderator_user_id) REFERENCES users(id) ON DELETE SET NULL
        )
      `,
      args: [],
    });

    await dbClient.execute({
      sql: "CREATE INDEX IF NOT EXISTS idx_report_actions_report ON report_actions(report_id, date_created DESC)",
      args: [],
    });

    await dbClient.execute({
      sql: "CREATE INDEX IF NOT EXISTS idx_report_actions_moderator ON report_actions(moderator_user_id, date_created DESC)",
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
  transaction: async (mode) => {
    await ensureSchema();
    return dbClient.transaction(mode);
  },
};

export const executeQuery = async (sql, args = []) => {
  await ensureSchema();
  const result = await dbClient.execute({ sql, args });
  return result.rows;
};
