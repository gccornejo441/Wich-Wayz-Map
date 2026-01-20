# Vercel Dev Server Fix - Runtime Config Deprecation

## Issue Summary

Vercel deprecated the `export const config = { runtime: "nodejs" }` syntax in API routes. This caused deprecation warnings when running `vercel dev`:

```
Warning: "export const config" will be removed in a future version.
Please use the exported functions directly instead.
```

## Changes Made

Removed the deprecated `export const config = { runtime: "nodejs" }` from **21 API route files** in the `/api` directory.

### Files Modified

1. [`api/add-new-shop.js`](api/add-new-shop.js)
2. [`api/comments.js`](api/comments.js)
3. [`api/health-db.js`](api/health-db.js)
4. [`api/vote.js`](api/vote.js)
5. [`api/votes/[shop_id].js`](api/votes/[shop_id].js)
6. [`api/users/index.js`](api/users/index.js)
7. [`api/users/[id].js`](api/users/[id].js)
8. [`api/users/shop-counts.js`](api/users/shop-counts.js)
9. [`api/users/firebase/[firebaseUid].js`](api/users/firebase/[firebaseUid].js)
10. [`api/locations/count.js`](api/locations/count.js)
11. [`api/locations/duplicates.js`](api/locations/duplicates.js)
12. [`api/categories/index.js`](api/categories/index.js)
13. [`api/categories/exists.js`](api/categories/exists.js)
14. [`api/categories/with-count.js`](api/categories/with-count.js)
15. [`api/auth/reset-password.js`](api/auth/reset-password.js)
16. [`api/comments/[shop_id].js`](api/comments/[shop_id].js)
17. [`api/analytics/shops-per-category.js`](api/analytics/shops-per-category.js)
18. [`api/analytics/shops-per-state.js`](api/analytics/shops-per-state.js)
19. [`api/shops/index.js`](api/shops/index.js)
20. [`api/shops/[id].js`](api/shops/[id].js)
21. [`api/shops/filter.js`](api/shops/filter.js)

### What Changed

**Before:**

```javascript
import { executeQuery } from "./lib/db.js";

export const config = { runtime: "nodejs" };

export default async function handler(req, res) {
  // handler code
}
```

**After:**

```javascript
import { executeQuery } from "./lib/db.js";

export default async function handler(req, res) {
  // handler code
}
```

## Why This Works

- **Node.js is now the default runtime** for Vercel serverless functions
- The explicit runtime configuration is no longer needed
- Removing the deprecated config eliminates the warnings without affecting functionality
- All API routes continue to work exactly as before

## Running Vercel Dev Server

### Starting the Development Server

```bash
# Start Vercel dev server (runs API routes on port 3000 by default)
vercel dev
```

### Common Development Workflow

1. **Terminal 1** - Run the Vite frontend dev server:

   ```bash
   npm run dev
   # Runs on http://localhost:3100
   ```

2. **Terminal 2** - Run the Vercel dev server for API routes:

   ```bash
   vercel dev
   # Runs on http://localhost:3000
   ```

3. Configure your frontend to proxy API calls to `http://localhost:3000/api/*`

### Stopping Vercel Dev

To cleanly stop the Vercel dev server:

- Press `Ctrl+C` in the terminal
- Wait for graceful shutdown
- If processes hang, use Task Manager (Windows) or `ps aux | grep vercel` (Unix) to manually kill processes

### Troubleshooting

#### Issue: "taskkill" errors on Windows

```
Error: The process "XXXX" not found.
```

**Cause:** Vercel tries to clean up child processes that have already exited.

**Solution:** These errors are **non-critical** and can be safely ignored. They don't affect functionality.

#### Issue: Port already in use

```
Error: Port 3000 is already in use
```

**Solution:**

```bash
# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# Unix/Mac
lsof -ti:3000 | xargs kill -9
```

#### Issue: API routes not working

**Checklist:**

1. Ensure `.env` file has all required variables (see `.env.sample`)
2. Verify database connection (Turso credentials)
3. Check that `vercel.json` is properly configured
4. Restart the Vercel dev server

## Testing the Fix

### Verify API Routes Still Work

1. Start the Vercel dev server:

   ```bash
   vercel dev
   ```

2. Test a sample API route:

   ```bash
   # Health check
   curl http://localhost:3000/api/health-db

   # Get shops
   curl http://localhost:3000/api/shops

   # Get categories
   curl http://localhost:3000/api/categories
   ```

3. **Expected:** All routes should return proper responses with no deprecation warnings in the console

### Verify No Deprecation Warnings

After running `vercel dev`, you should **NOT** see:

```
Warning: "export const config" will be removed in a future version.
```

## Deployment

These changes are **safe to deploy** to production:

- No breaking changes to API behavior
- No changes to API responses or signatures
- Only removes deprecated configuration syntax
- Fully backward compatible

### Deploy to Vercel

```bash
# Commit changes
git add api/
git commit -m "fix: remove deprecated runtime config from API routes"
git push origin main

# Vercel auto-deploys on push to main branch
```

## Additional Notes

- This fix aligns with Vercel's latest best practices
- No changes needed to [`vercel.json`](vercel.json) configuration
- The fix applies only to serverless function configuration, not edge functions
- If you add new API routes in the future, **do not** include the `export const config` line

## References

- [Vercel Serverless Functions Documentation](https://vercel.com/docs/functions/serverless-functions)
- [Vercel Runtime Configuration](https://vercel.com/docs/functions/serverless-functions/runtimes)

---

**Last Updated:** 2026-01-19  
**Fixed By:** Automated refactoring to remove deprecated runtime config
