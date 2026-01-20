# API Router Documentation

## Overview

The Wich-Wayz-Map project uses a **single catch-all API endpoint** (`api/[...path].js`) to route all API requests. This architecture reduces the number of serverless functions from 20+ down to 1, which is essential for deploying on Vercel's Hobby plan (limited to 12 serverless functions).

## Architecture

### Directory Structure

```
Wich-Wayz-Map/
├── api/
│   └── [...path].js          # Single catch-all router (ONLY serverless function)
├── server/
│   └── api/                  # Actual API handlers (NOT serverless functions)
│       ├── add-new-shop.js
│       ├── comments.js
│       ├── create-payment-link.js
│       ├── health-db.js
│       ├── vote.js
│       ├── webhook.js
│       ├── analytics/
│       │   ├── shops-per-category.js
│       │   └── shops-per-state.js
│       ├── auth/
│       │   └── reset-password.js
│       ├── categories/
│       │   ├── exists.js
│       │   ├── index.js
│       │   └── with-count.js
│       ├── comments/
│       │   └── [shop_id].js
│       ├── lib/
│       │   └── db.js          # Helper module (not a route)
│       ├── locations/
│       │   ├── count.js
│       │   └── duplicates.js
│       ├── shops/
│       │   ├── [id].js
│       │   ├── filter.js
│       │   └── index.js
│       ├── users/
│       │   ├── [id].js
│       │   ├── index.js
│       │   ├── shop-counts.js
│       │   └── firebase/
│       │       └── [firebaseUid].js
│       └── votes/
│           └── [shop_id].js
└── vercel.json               # Configuration to include server/ in deployment
```

## How It Works

### 1. Request Flow

1. Client makes request: `GET /api/shops`
2. Vercel routes to: `api/[...path].js` with `req.query.path = ["shops"]`
3. Router scans `server/api/` directory and builds route map
4. Router matches path to `server/api/shops/index.js`
5. Router dynamically imports the handler and calls it
6. Handler executes and returns response

### 2. Routing Rules

The router follows Next.js/Vercel-style routing conventions:

| File Path                                    | Matches URL                  | Parameters                          |
| -------------------------------------------- | ---------------------------- | ----------------------------------- |
| `server/api/vote.js`                         | `/api/vote`                  | None                                |
| `server/api/shops/index.js`                  | `/api/shops`                 | None                                |
| `server/api/shops/[id].js`                   | `/api/shops/123`             | `req.params.id = "123"`             |
| `server/api/comments/[shop_id].js`           | `/api/comments/456`          | `req.params.shop_id = "456"`        |
| `server/api/users/firebase/[firebaseUid].js` | `/api/users/firebase/abc123` | `req.params.firebaseUid = "abc123"` |

### 3. Route Priority

When multiple routes could match, the router prioritizes:

1. **Static segments over dynamic** (`:param`)
2. **Longer paths over shorter**
3. **Alphabetical order** (for ties)

Examples:

- `/api/shops/filter` matches `shops/filter.js` (not `shops/[id].js`)
- `/api/users/123` matches `users/[id].js`
- `/api/users/firebase/abc` matches `users/firebase/[firebaseUid].js`

### 4. Request Body Parsing

The router automatically parses JSON request bodies for POST/PUT/PATCH requests:

```javascript
// In your handler, req.body is already parsed
export default async function handler(req, res) {
  const { shopName, userId } = req.body; // ✅ Works automatically
  // ...
}
```

### 5. Parameters

Dynamic route parameters are available in **two places** for backward compatibility:

```javascript
export default async function handler(req, res) {
  const shopId = req.params.id; // ✅ Preferred
  const shopIdAlt = req.query.id; // ✅ Also available
  // ...
}
```

## Adding New Endpoints

### Step 1: Create Handler File

Create a new file in `server/api/` following the naming convention:

```javascript
// server/api/myendpoint.js
import { executeQuery } from "./lib/db.js";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const rows = await executeQuery("SELECT * FROM my_table");
    res.status(200).json(rows);
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}
```

### Step 2: Test Locally

Use `vercel dev` (not `npm run dev`) to test API endpoints:

```bash
vercel dev
# Then visit: http://localhost:3000/api/myendpoint
```

### Step 3: Deploy

Push to your repository - the catch-all router automatically picks up new files in `server/api/`.

```bash
git add server/api/myendpoint.js
git commit -m "Add new endpoint"
git push
```

## Dynamic Routes

### Simple Dynamic Route

```javascript
// server/api/items/[id].js
export default async function handler(req, res) {
  const itemId = req.params.id; // From URL: /api/items/123
  // ...
}
```

### Nested Dynamic Route

```javascript
// server/api/items/[id]/comments/[commentId].js
export default async function handler(req, res) {
  const { id, commentId } = req.params;
  // From URL: /api/items/123/comments/456
  // ...
}
```

## Common Patterns

### Database Access

```javascript
import { db, executeQuery } from "./lib/db.js";

// Simple query
const rows = await executeQuery("SELECT * FROM shops WHERE id = ?", [shopId]);

// Transaction
const transaction = await db.transaction();
try {
  await transaction.execute({ sql: "INSERT INTO ...", args: [...] });
  await transaction.execute({ sql: "UPDATE ...", args: [...] });
  await transaction.commit();
} catch (error) {
  await transaction.rollback();
  throw error;
}
```

### Error Handling

```javascript
export default async function handler(req, res) {
  try {
    // Your logic
    res.status(200).json({ success: true });
  } catch (error) {
    console.error("Error in handler:", error);
    res.status(500).json({
      error: "Operation failed",
      message: error.message,
    });
  }
}
```

### Method Validation

```javascript
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  // POST logic
}
```

## Development Workflow

### Which Command Should I Use?

Choose the appropriate command based on what you're working on:

| Task                                         | Command       | Port | API Works? |
| -------------------------------------------- | ------------- | ---- | ---------- |
| **Full-stack development** (API + Frontend)  | `vercel dev`  | 3000 | ✅ Yes     |
| **Frontend-only** (UI/styling, no API calls) | `npm run dev` | 3100 | ❌ No      |

### Option 1: Full-Stack Development (Recommended)

Use this when you need API endpoints to work (e.g., testing shop data, voting, authentication):

```bash
vercel dev
```

**What it does:**

- Runs both Vite frontend AND serverless API functions
- Hot reloads API changes automatically
- Simulates production Vercel environment
- Access at: `http://localhost:3000`
- API endpoints work at: `http://localhost:3000/api/*`

**When to use:**

- Testing API integrations
- Working on features that fetch/submit data
- End-to-end testing of user flows
- Debugging API issues

### Option 2: Frontend-Only Development

Use this when you're only working on UI/styling and don't need API data:

```bash
npm run dev
```

**What it does:**

- Runs ONLY the Vite dev server (frontend)
- Faster startup than `vercel dev`
- Access at: `http://localhost:3100`
- ⚠️ **API endpoints will NOT work** (no backend running)

**When to use:**

- Working on CSS/styling changes
- Building UI components without real data
- Prototyping new layouts
- Making changes that don't require API calls

**Note:** API calls will fail with connection errors. This is expected behavior.

### Advanced: Running Both Separately

If you need more control (e.g., different ports, separate terminals):

```bash
# Terminal 1: Start Vercel dev server (backend only)
vercel dev --listen 3001

# Terminal 2: Start Vite dev server (frontend)
npm run dev
# Frontend runs on port 3100
# Backend runs on port 3001
```

**Important:** If you use this approach, you'll need to configure a proxy in [`vite.config.ts`](../vite.config.ts) to forward `/api/*` requests from port 3100 to port 3001. This is only recommended for advanced use cases.

## Troubleshooting

### 404 Error

**Symptoms**: API request returns 404

**Possible Causes**:

1. File not in `server/api/` directory
2. File is in `lib/` or other excluded directory
3. Filename doesn't match URL pattern

**Solution**: Check file location and naming:

```bash
# ✅ Correct
server/api/shops/index.js → /api/shops
server/api/shops/[id].js → /api/shops/123

# ❌ Wrong
api/shops/index.js → Not found (wrong directory)
server/shops/index.js → Not found (missing api/)
```

### 500 Error

**Symptoms**: Internal server error

**Possible Causes**:

1. Handler doesn't export default function
2. Import path incorrect
3. Database connection issue

**Solution**: Check handler structure:

```javascript
// ✅ Correct
export default async function handler(req, res) {
  // ...
}

// ❌ Wrong
export const handler = async (req, res) => {
  // Missing 'default'
};
```

### Params Not Available

**Symptoms**: `req.params.id` is undefined

**Possible Causes**:

1. Filename doesn't use bracket notation
2. Wrong parameter name

**Solution**:

```javascript
// Filename: [shop_id].js
const shopId = req.params.shop_id; // ✅ Matches filename

// Filename: [id].js
const id = req.params.id; // ✅ Matches filename
```

### Vercel Build Fails

**Symptoms**: "No more than 12 Serverless Functions" error

**Possible Causes**:

1. Files still in `api/` directory (other than `[...path].js`)
2. `vercel.json` not configured correctly

**Solution**:

```bash
# Check api/ directory
ls api/
# Should ONLY show: [...path].js

# Verify vercel.json
cat vercel.json
# Should include: "includeFiles": "server/**"
```

## Performance Considerations

### Route Caching

The router builds and caches the route map on first request:

- ✅ Subsequent requests are fast (cached)
- ✅ No filesystem scanning on every request
- ⚠️ Cache persists only for single function invocation
- ⚠️ Vercel may cold-start between requests (normal behavior)

### Cold Starts

Vercel serverless functions have cold starts (~1-2 seconds):

- First request after deployment: slower
- Subsequent requests: fast
- This is normal Vercel behavior

### Import Performance

Dynamic imports (`import()`) are used to load handlers:

- ✅ Only loads code for the requested endpoint
- ✅ Reduces memory footprint
- ✅ Better than loading all handlers upfront

## Migration Notes

### From Old Structure to New

If you're migrating from the old multi-function structure:

1. **All handlers remain unchanged** - no code changes needed
2. **Imports stay relative** - `./lib/db.js` still works
3. **Request/response objects identical** - same API
4. **Environment variables unchanged** - same `.env` setup

### Breaking Changes

**None** - The catch-all router is fully backward compatible.

## Configuration Reference

### `vercel.json`

```json
{
  "functions": {
    "api/[...path].js": {
      "includeFiles": "server/**"
    }
  }
}
```

**Required**: This ensures `server/` directory is included in the deployed function bundle.

### Why This Works

- Vercel only counts files in `api/` as serverless functions
- Files in `server/` are just regular modules
- `includeFiles` bundles `server/` with the catch-all function
- Result: 1 serverless function instead of 20+

## Best Practices

1. **Keep handlers simple** - One responsibility per file
2. **Use transactions** - For multi-step database operations
3. **Validate input** - Always check `req.method` and parameters
4. **Handle errors** - Use try-catch and return proper status codes
5. **Log errors** - Use `console.error()` for debugging
6. **Return JSON** - Always `res.json()`, not `res.send()`
7. **Set status codes** - Be explicit: `res.status(200)`, `res.status(404)`, etc.

## Resources

- [Vercel Serverless Functions](https://vercel.com/docs/functions/serverless-functions)
- [Next.js API Routes](https://nextjs.org/docs/api-routes/introduction)
- [Dynamic API Routes](https://nextjs.org/docs/api-routes/dynamic-api-routes)

---

**Last Updated**: 2026-01-20
**Maintained by**: Wich-Wayz-Map Team
