import { readdir } from "fs/promises";
import { join, sep } from "path";
import { pathToFileURL } from "url";

/**
 * Catch-all API router for Vercel serverless functions.
 * Routes all /api/* requests to handlers in server/api/**
 *
 * This allows the project to have only 1 serverless function instead of 12+,
 * which is required for Vercel Hobby plan deployments.
 */

// Parse request body if needed
async function parseBody(req) {
  if (req.body !== undefined) {
    return; // Already parsed by Vercel
  }

  if (
    req.method === "GET" ||
    req.method === "HEAD" ||
    req.method === "DELETE"
  ) {
    return; // No body expected
  }

  return new Promise((resolve) => {
    let data = "";
    req.on("data", (chunk) => {
      data += chunk.toString();
    });
    req.on("end", () => {
      try {
        req.body = data ? JSON.parse(data) : {};
      } catch {
        req.body = data;
      }
      resolve();
    });
    req.on("error", () => {
      req.body = {};
      resolve();
    });
  });
}

// Build route map by scanning server/api directory
let routeCache = null;

async function buildRouteMap() {
  // In development, always rebuild routes to catch new files
  const isDev = process.env.NODE_ENV !== "production";
  if (routeCache && !isDev) return routeCache;

  const routes = [];
  // Use process.cwd() for reliable path resolution in serverless environments
  const serverApiDir = join(process.cwd(), "server", "api");

  const isDebug = process.env.DEBUG_API_ROUTER === "1";

  async function scan(dir, prefix = "") {
    let entries;
    try {
      entries = await readdir(dir, { withFileTypes: true });
    } catch (err) {
      console.error(`Failed to read directory ${dir}:`, err);
      return;
    }

    for (const entry of entries) {
      const fullPath = join(dir, entry.name);
      // Always use forward slashes for URL paths, even on Windows
      const routePath = prefix + "/" + entry.name;

      if (entry.isDirectory()) {
        await scan(fullPath, routePath);
      } else if (entry.name.endsWith(".js") && entry.name !== "db.js") {
        // Skip lib/db.js - it's a helper, not a route
        if (routePath.includes("/lib/")) continue;

        const fileName = entry.name.replace(/\.js$/, "");
        let pattern;

        if (fileName === "index") {
          // /server/api/shops/index.js -> /api/shops
          pattern = prefix || "/";
        } else if (fileName.startsWith("[") && fileName.endsWith("]")) {
          // /server/api/shops/[id].js -> /api/shops/:id
          const paramName = fileName.slice(1, -1);
          pattern = prefix + "/:" + paramName;
        } else {
          // /server/api/vote.js -> /api/vote
          pattern = prefix + "/" + fileName;
        }

        // Normalize the pattern to always use forward slashes
        const normalizedPattern = pattern.split(sep).join("/");

        routes.push({
          pattern: normalizedPattern,
          filePath: fullPath, // Keep native path for file operations
          segments: normalizedPattern.split("/").filter(Boolean),
        });
      }
    }
  }

  await scan(serverApiDir);

  // Sort routes: static segments before params, longer before shorter
  routes.sort((a, b) => {
    const aStatic = a.segments.filter((s) => !s.startsWith(":")).length;
    const bStatic = b.segments.filter((s) => !s.startsWith(":")).length;

    if (aStatic !== bStatic) return bStatic - aStatic; // More static = higher priority

    if (a.segments.length !== b.segments.length) {
      return b.segments.length - a.segments.length; // Longer = higher priority
    }

    return a.pattern.localeCompare(b.pattern);
  });

  if (isDebug) {
    console.error("[API Router] Built route map:", {
      totalRoutes: routes.length,
      routes: routes.map((r) => ({
        pattern: r.pattern,
        segments: r.segments,
      })),
    });
  }

  routeCache = routes;
  return routes;
}

// Match incoming path to a route
function matchRoute(routes, pathSegments) {
  for (const route of routes) {
    if (route.segments.length !== pathSegments.length) continue;

    const params = {};
    let matches = true;

    for (let i = 0; i < route.segments.length; i++) {
      const routeSeg = route.segments[i];
      const pathSeg = pathSegments[i];

      if (routeSeg.startsWith(":")) {
        // Dynamic segment
        params[routeSeg.slice(1)] = pathSeg;
      } else if (routeSeg !== pathSeg) {
        // Static segment mismatch
        matches = false;
        break;
      }
    }

    if (matches) {
      return { route, params };
    }
  }

  return null;
}

export default async function handler(req, res) {
  const isDebug = process.env.DEBUG_API_ROUTER === "1";

  try {
    // Parse body if needed
    await parseBody(req);

    // Get requested path from catch-all segments
    const pathArray = req.query.path || [];
    const requestPath = Array.isArray(pathArray) ? pathArray : [pathArray];

    if (isDebug) {
      console.error("[API Router] Request path:", requestPath);
      console.error("[API Router] Request method:", req.method);
    }

    // Build and match routes
    const routes = await buildRouteMap();

    if (isDebug) {
      console.error(
        "[API Router] Available routes:",
        routes.map((r) => ({
          pattern: r.pattern,
          segments: r.segments,
        })),
      );
    }

    const match = matchRoute(routes, requestPath);

    if (!match) {
      if (isDebug) {
        console.error("[API Router] No match found for:", requestPath);
        console.error(
          "[API Router] Tried matching against",
          routes.length,
          "routes",
        );
      }
      return res.status(404).json({
        error: "Not Found",
        path: "/api/" + requestPath.join("/"),
        routesCount: routes.length,
      });
    }

    if (isDebug) {
      console.error(
        "[API Router] Matched route:",
        match.route.pattern,
        "->",
        match.route.filePath,
      );
    }

    // Set params on request for handler compatibility
    req.params = match.params;

    // Merge params into query for backward compatibility
    req.query = { ...req.query, ...match.params };

    // Dynamically import and execute the handler using pathToFileURL for reliability
    let handlerModule;
    try {
      const fileUrl = pathToFileURL(match.route.filePath).href;

      if (isDebug) {
        console.error("[API Router] Importing handler from:", fileUrl);
      }

      handlerModule = await import(fileUrl);
    } catch (importError) {
      console.error(
        `Failed to import handler at ${match.route.filePath}:`,
        importError,
      );
      return res.status(500).json({
        error: "Internal Server Error",
        message: "Failed to load handler module",
        details: importError.message,
      });
    }

    const handlerFn = handlerModule.default;

    if (typeof handlerFn !== "function") {
      console.error(
        `Handler at ${match.route.filePath} does not export a default function`,
      );
      return res.status(500).json({
        error: "Internal Server Error",
        message: "Invalid handler configuration",
      });
    }

    // Execute the handler
    await handlerFn(req, res);
  } catch (error) {
    console.error("API Router Error:", error);

    if (!res.headersSent) {
      res.status(500).json({
        error: "Internal Server Error",
        message: error.message,
      });
    }
  }
}
