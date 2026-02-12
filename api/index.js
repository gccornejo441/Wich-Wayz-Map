import { readdir } from "fs/promises";
import { join, sep } from "path";
import { pathToFileURL } from "url";

async function parseBody(req) {
  if (req.body !== undefined) {
    return;
  }

  if (
    req.method === "GET" ||
    req.method === "HEAD" ||
    req.method === "DELETE"
  ) {
    return;
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

let routeCache = null;

async function buildRouteMap() {
  const isDev = process.env.NODE_ENV !== "production";
  if (routeCache && !isDev) return routeCache;

  const routes = [];
  const serverApiDir = join(process.cwd(), "server", "api");

  const isDebug = process.env.DEBUG_API_ROUTER === "1";

  async function scan(dir, prefix = "") {
    let entries;
    try {
      entries = await readdir(dir, { withFileTypes: true });
    } catch (err) {
      if (isDebug) {
        console.error(`Failed to read directory ${dir}:`, err);
      }
      return;
    }

    for (const entry of entries) {
      const fullPath = join(dir, entry.name);

      if (entry.isDirectory()) {
        const segment =
          entry.name.startsWith("[") && entry.name.endsWith("]")
            ? `:${entry.name.slice(1, -1)}`
            : entry.name;
        const nextPrefix = prefix + "/" + segment;
        await scan(fullPath, nextPrefix);
      } else if (entry.name.endsWith(".js") && entry.name !== "db.js") {
        const routePath = prefix + "/" + entry.name;
        if (routePath.includes("/lib/")) continue;

        const fileName = entry.name.replace(/\.js$/, "");
        let pattern;

        if (fileName === "index") {
          pattern = prefix || "/";
        } else if (fileName.startsWith("[") && fileName.endsWith("]")) {
          const paramName = fileName.slice(1, -1);
          pattern = prefix + "/:" + paramName;
        } else {
          pattern = prefix + "/" + fileName;
        }

        const normalizedPattern = pattern.split(sep).join("/");

        routes.push({
          pattern: normalizedPattern,
          filePath: fullPath,
          segments: normalizedPattern.split("/").filter(Boolean),
        });
      }
    }
  }

  try {
    await scan(serverApiDir);
  } catch (err) {
    console.error("Failed to scan server/api directory:", err);
    return [];
  }

  routes.sort((a, b) => {
    const aStatic = a.segments.filter((s) => !s.startsWith(":")).length;
    const bStatic = b.segments.filter((s) => !s.startsWith(":")).length;

    if (aStatic !== bStatic) return bStatic - aStatic;

    if (a.segments.length !== b.segments.length) {
      return b.segments.length - a.segments.length;
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

function matchRoute(routes, pathSegments) {
  for (const route of routes) {
    if (route.segments.length !== pathSegments.length) continue;

    const params = {};
    let matches = true;

    for (let i = 0; i < route.segments.length; i++) {
      const routeSeg = route.segments[i];
      const pathSeg = pathSegments[i];

      if (routeSeg.startsWith(":")) {
        params[routeSeg.slice(1)] = pathSeg;
      } else if (routeSeg !== pathSeg) {
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
    await parseBody(req);

    const raw = req.query.path ?? "";
    const requestPath = String(raw).split("/").filter(Boolean);

    if (isDebug) {
      console.error("[API Router] Request path:", requestPath);
      console.error("[API Router] Request method:", req.method);
    }

    const routes = await buildRouteMap();

    if (routes.length === 0) {
      return res.status(500).json({
        error: "Internal Server Error",
        message: "No API routes found. server/api directory may be missing.",
      });
    }

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

    req.params = match.params;

    req.query = { ...req.query, ...match.params };

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
