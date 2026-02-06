# Firebase Authentication Migration

This document describes the complete migration from custom JWT tokens to Firebase ID tokens.

## Overview

We've migrated from a custom JWT-based authentication system to Firebase-first authentication with zero client-side token storage.

## What Changed

### Before Migration:
- ❌ Custom JWT tokens generated server-side
- ❌ Access tokens + refresh tokens stored in localStorage
- ❌ Token expiry tracking in localStorage  
- ❌ Sensitive user fields (hashedPassword, verificationToken, resetToken) sent to client
- ❌ Manual token refresh logic
- ❌ Auth fallbacks via body/query params (security hole)

### After Migration:
- ✅ Firebase ID tokens fetched just-in-time
- ✅ Zero token storage (Firebase manages tokens internally)
- ✅ Automatic token refresh by Firebase SDK
- ✅ Only safe user metadata sent to client
- ✅ Authorization header required (no fallbacks)
- ✅ Server-side Firebase token verification

## Architecture

### Frontend Flow:
1. User signs in via Firebase (email/password or Google)
2. Firebase SDK manages authentication state
3. When making API calls:
   - `getFirebaseIdToken()` fetches current token
   - Token added to `Authorization: Bearer <token>` header
   - Token is NEVER stored anywhere
4. Firebase automatically refreshes expired tokens

### Backend Flow:
1. API route receives request with `Authorization: Bearer <firebase-token>`
2. `extractAuthUser()` middleware extracts token
3. `verifyFirebaseToken()` validates with Firebase Admin SDK
4. Returns `{ firebaseUid, email }` if valid
5. Route fetches user from database using firebaseUid
6. Derives userId, role, permissions from database (not from token)

## Environment Variables

### Required (Server-Side):
```bash
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

### How to Get These:
1. Go to Firebase Console
2. Project Settings → Service Accounts
3. Generate New Private Key
4. Copy values to Vercel/hosting environment variables

**Important:** When setting `FIREBASE_PRIVATE_KEY` in Vercel:
- Keep the quotes
- Newlines will be literal `\n` strings (that's correct)
- The code handles converting `\n` strings to actual newlines

## Security Improvements

### 1. No Client-Side Token Storage
- **Before:** XSS could steal tokens from localStorage
- **After:** No tokens stored, nothing to steal

### 2. No Sensitive Data on Client
- **Before:** Client received hashedPassword, verificationToken, resetToken
- **After:** Only safe metadata (name, email, role, etc.)

### 3. Server-Side Authorization
- **Before:** Role/userId from client-provided token payload
- **After:** Role/userId fetched from database using verified firebaseUid

### 4. No Auth Fallbacks
- **Before:** Accepted userId/role in request body/query
- **After:** Requires Authorization header, rejects body/query auth

## Migration Impact

### Breaking Changes:
- All existing sessions invalidated (users must re-login)
- Old localStorage keys cleared on logout
- API routes now require `Authorization: Bearer` header

### Backwards Compatibility:
- None intentionally (clean break)
- Old storage keys cleaned up but don't cause errors

## Testing

### Manual Tests:
1. **Login:** Email/password and Google sign-in work
2. **Storage:** Check DevTools - no tokens in localStorage/sessionStorage
3. **API Calls:** Network tab shows `Authorization: Bearer` header
4. **Token Refresh:** Wait >1 hour, API calls still work (Firebase auto-refreshes)
5. **Logout:** All storage cleared, subsequent API calls fail with 401

### Integration Tests:
```bash
npm test
```

Key test cases:
- `getFirebaseIdToken()` returns valid token
- `apiRequest()` includes Authorization header
- Protected routes reject requests without valid Firebase token
- Safe metadata doesn't include sensitive fields

## Rollback Plan

If critical issues arise:

1. **Immediate:** Revert to commit before PR3-6
2. **Short-term:** Deploy PR1+PR2 only (safe metadata, no auth change)
3. **Long-term:** Fix issues in feature branch, redeploy

## Performance

### Token Fetching:
- First call: ~50-100ms (Firebase SDK)
- Cached calls: ~5-10ms (Firebase caches internally)
- Impact: Negligible (<0.1s per request)

### Token Verification (Server):
- ~10-50ms per request (Firebase Admin SDK)
- Firebase caches verification results
- Impact: Acceptable for API latency

## Removed Dependencies

After this migration, you can remove:
```bash
npm uninstall jose  # JWT library (if not used elsewhere)
```

Note: We kept `bcryptjs` for password hashing during registration.

## Monitoring

Watch for:
- 401 errors spike (auth failures)
- User complaints about being logged out
- API latency increase (token verification overhead)

Firebase Console shows:
- Auth success/failure rates
- Token verification quotas
- User sessions

## Support

For issues:
1. Check Firebase Console for auth errors
2. Verify environment variables set correctly
3. Check server logs for "Firebase Admin SDK initialized"
4. Verify user has valid Firebase session (not just old localStorage data)

## References

- [Firebase Admin SDK Docs](https://firebase.google.com/docs/admin/setup)
- [Firebase ID Token Verification](https://firebase.google.com/docs/auth/admin/verify-id-tokens)
- [Security Best Practices](https://firebase.google.com/docs/rules/security)