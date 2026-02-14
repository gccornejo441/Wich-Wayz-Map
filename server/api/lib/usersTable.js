let capabilitiesPromise = null;

export const getUsersTableCapabilities = async (turso) => {
  if (!capabilitiesPromise) {
    capabilitiesPromise = turso
      .execute({
        sql: "PRAGMA table_info(users)",
        args: [],
      })
      .then((tableInfo) => {
        const columns = new Map(
          tableInfo.rows.map((column) => [String(column.name), column]),
        );

        return {
          hasAuthProvider: columns.has("auth_provider"),
          hasDeletedAt: columns.has("deleted_at"),
          hasUsernameFinalizedAt: columns.has("username_finalized_at"),
          hashedPasswordRequired:
            Number(columns.get("hashed_password")?.notnull ?? 0) === 1,
        };
      })
      .catch((error) => {
        // Reset cache on failure to allow retries on subsequent requests.
        capabilitiesPromise = null;
        throw error;
      });
  }

  return capabilitiesPromise;
};
