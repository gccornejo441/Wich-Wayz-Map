# API Routing Patterns

## File-Based Routing System

The application uses a custom file-based routing system (implemented in [`api/index.js`](../api/index.js)) that maps files in the `server/api/` directory to HTTP endpoints.

## Supported Patterns

### ✅ Working Patterns

#### 1. Static Routes

```
File: server/api/shops/index.js
Route: /shops
```

#### 2. Dynamic Parameters (Filename-based)

```
File: server/api/shops/[id].js
Route: /shops/:id
Example: /shops/123
```

#### 3. Nested Static + Dynamic Parameters

```
File: server/api/shops/location-status/[shopId].js
Route: /shops/location-status/:shopId
Example: /shops/location-status/110
```

### ❌ Unsupported Patterns

#### Dynamic Parameter Directories

```
File: server/api/shops/[shopId]/location-status.js
Route: /shops/[shopId]/location-status (LITERAL - does NOT work)
```

**Why it doesn't work:** The routing system only converts `[param]` syntax to `:param` when it appears in **filenames**, not directory names. Directory names are treated as literal strings.

## Routing Logic Explanation

From [`api/index.js`](../api/index.js:64-79):

```javascript
if (entry.isDirectory()) {
  await scan(fullPath, routePath); // Directory names are literal strings
} else if (entry.name.endsWith(".js") && entry.name !== "db.js") {
  const fileName = entry.name.replace(/\.js$/, "");

  if (fileName === "index") {
    pattern = prefix || "/";
  } else if (fileName.startsWith("[") && fileName.endsWith("]")) {
    const paramName = fileName.slice(1, -1);
    pattern = prefix + "/:" + paramName; // ONLY filenames get converted
  } else {
    pattern = prefix + "/" + fileName;
  }
}
```

**Key insight:** Only **filenames** with `[param]` syntax are converted to route parameters. Directories with `[param]` names remain literal strings in the route pattern.

## Best Practices

### When Designing New Endpoints

1. **Use static directory names** for grouping related endpoints
2. **Use `[param]` filenames** for dynamic parameters
3. **Structure endpoints logically** to match REST conventions where possible

### Example: Good Endpoint Design

```
✅ server/api/shops/location-status/[shopId].js → /shops/location-status/:shopId
✅ server/api/votes/[shop_id].js → /votes/:shop_id
✅ server/api/comments/[shop_id].js → /comments/:shop_id
```

### Example: Avoid This Pattern

```
❌ server/api/shops/[shopId]/location-status.js → /shops/[shopId]/location-status (literal)
```

If you need a route like `/shops/:shopId/location-status`, consider:

- **Option A**: Restructure to `/shops/location-status/:shopId` (recommended)
- **Option B**: Create a custom route handler in the main router
- **Option C**: Use query parameters instead of path parameters

## Migration Notes

If you encounter 404 errors with nested dynamic routes:

1. Check if the route follows the unsupported pattern (directory with `[param]` name)
2. Restructure the file to use a supported pattern
3. Update frontend API calls to match the new route structure
4. Update any documentation referencing the old route

### Example Migration

**Before (404):**

```
File: server/api/shops/[shopId]/location-status.js
Frontend: `/shops/${shopId}/location-status`
Result: 404 Not Found
```

**After (✅ Works):**

```
File: server/api/shops/location-status/[shopId].js
Frontend: `/shops/location-status/${shopId}`
Result: 200 OK
```

## Debugging Routes

Enable debug mode to see all registered routes:

```bash
DEBUG_API_ROUTER=1 npm run dev
```

This will log:

- All discovered route patterns
- Request path segments
- Matched routes
- Handler file paths

## Related Files

- [`api/index.js`](../api/index.js) - Main routing logic
- [`server/api/shops/location-status/[shopId].js`](../server/api/shops/location-status/[shopId].js) - Example of correct pattern
- [`src/services/shopService.ts`](../src/services/shopService.ts) - Frontend API client usage
