import { createClient } from "@libsql/client";
import path from "path";
import { pathToFileURL } from "url";

let tursoClient = null;

export const getTursoClient = () => {
  if (tursoClient) {
    return tursoClient;
  }

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

  tursoClient = createClient(
    isFileUrl ? { url: resolvedUrl } : { url: rawUrl, authToken: rawAuthToken },
  );

  return tursoClient;
};
