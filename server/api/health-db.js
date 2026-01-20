import { executeQuery } from "./lib/db.js";
import path from "path";
import { pathToFileURL } from "url";
import { existsSync } from "fs";

const redactUrl = (url) => {
  if (!url) return null;
  if (url.startsWith("file:")) return url;

  try {
    const u = new URL(url);
    // keep protocol + host only (no path/query)
    return `${u.protocol}//${u.host}`;
  } catch {
    // fallback: show prefix only
    return url.slice(0, 24) + "...";
  }
};

const maskToken = (token) => {
  if (!token) return { present: false, preview: null };
  const trimmed = String(token);
  if (trimmed.length <= 8) return { present: true, preview: "********" };
  return {
    present: true,
    preview: `${trimmed.slice(0, 4)}...${trimmed.slice(-4)}`,
  };
};

export default async function handler(req, res) {
  const rawUrl = process.env.DATABASE_URL || process.env.TURSO_URL || null;
  const rawAuthToken =
    process.env.DATABASE_AUTH_TOKEN || process.env.TURSO_AUTH_TOKEN || null;

  const isFileUrl = !!rawUrl && rawUrl.startsWith("file:");
  const cwd = process.cwd();

  const resolvedFileUrl =
    isFileUrl && rawUrl
      ? pathToFileURL(
          path.resolve(cwd, rawUrl.replace(/^file:/, "")),
        ).toString()
      : null;

  const resolvedFilePath =
    isFileUrl && rawUrl
      ? path.resolve(cwd, rawUrl.replace(/^file:/, ""))
      : null;

  try {
    const rows = await executeQuery("SELECT 1 AS ok");
    const okValue = rows?.[0]?.ok;
    const ok =
      okValue === 1 ||
      okValue === "1" ||
      okValue === true ||
      okValue === "true";

    res.status(200).json({
      ok,
      mode: isFileUrl ? "file" : "remote",
      cwd,
      env: {
        urlSource: process.env.DATABASE_URL ? "DATABASE_URL" : "TURSO_URL",
        tokenSource: process.env.DATABASE_AUTH_TOKEN
          ? "DATABASE_AUTH_TOKEN"
          : "TURSO_AUTH_TOKEN",
        url: redactUrl(rawUrl),
        token: maskToken(rawAuthToken),
      },
      file: isFileUrl
        ? {
            rawUrl,
            resolvedFileUrl,
            resolvedFilePath,
            exists: resolvedFilePath ? existsSync(resolvedFilePath) : false,
          }
        : null,
    });
  } catch (error) {
    console.error("Database health check failed:", error);
    res.status(500).json({
      ok: false,
      mode: isFileUrl ? "file" : "remote",
      cwd,
      env: {
        urlSource: process.env.DATABASE_URL ? "DATABASE_URL" : "TURSO_URL",
        tokenSource: process.env.DATABASE_AUTH_TOKEN
          ? "DATABASE_AUTH_TOKEN"
          : "TURSO_AUTH_TOKEN",
        url: redactUrl(rawUrl),
        token: maskToken(rawAuthToken),
      },
      file: isFileUrl
        ? {
            rawUrl,
            resolvedFileUrl,
            resolvedFilePath,
            exists: resolvedFilePath ? existsSync(resolvedFilePath) : false,
          }
        : null,
      error: String(error?.message || error),
    });
  }
}
