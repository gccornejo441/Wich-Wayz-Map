# Firebase Admin SDK Setup Guide

This guide explains how to configure Firebase Admin SDK for server-side token verification.

## Why Firebase Admin SDK?

The Firebase Admin SDK allows your backend API to verify Firebase ID tokens, ensuring that:

- Users are authenticated by Firebase
- Tokens haven't been tampered with
- Tokens haven't expired
- The firebaseUid extracted from the token is genuine

Without this, your API would trust any `firebaseUid` sent by the client, which is a critical security vulnerability.

## Getting Your Service Account Credentials

### Step 1: Open Firebase Console

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project

### Step 2: Navigate to Service Accounts

1. Click the **⚙️ (Settings)** icon next to "Project Overview"
2. Select **Project settings**
3. Click the **Service accounts** tab

### Step 3: Generate Private Key

1. Click **Generate new private key**
2. Confirm by clicking **Generate key**
3. A JSON file will download (e.g., `your-project-firebase-adminsdk-xxxxx.json`)

**⚠️ IMPORTANT**: Keep this file secure! It grants full admin access to your Firebase project.

### Step 4: Extract the Credentials

Open the downloaded JSON file. You'll see something like:

```json
{
  "type": "service_account",
  "project_id": "your-project-id",
  "private_key_id": "abc123...",
  "private_key": "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEF...\n-----END PRIVATE KEY-----\n",
  "client_email": "firebase-adminsdk-xxxxx@your-project-id.iam.gserviceaccount.com",
  "client_id": "1234567890...",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/..."
}
```

You need three values:

1. `project_id`
2. `private_key`
3. `client_email`

## Adding Credentials to .env File

### Local Development

Edit your `.env` file and add:

```bash
# Firebase Admin SDK (Server-side)
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project-id.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBg...\n-----END PRIVATE KEY-----\n"
```

**⚠️ Important Notes:**

1. **Private Key Format**:
   - Keep the `\n` characters as-is (they represent newlines)
   - Wrap the entire key in double quotes
   - Copy the ENTIRE key including `-----BEGIN PRIVATE KEY-----` and `-----END PRIVATE KEY-----`

2. **Correct Example**:

   ```bash
   FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC...\n-----END PRIVATE KEY-----\n"
   ```

3. **Incorrect Examples**:

   ```bash
   # ❌ Missing quotes
   FIREBASE_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----...

   # ❌ Missing \n characters
   FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----MIIEvQI..."

   # ❌ Missing BEGIN/END markers
   FIREBASE_PRIVATE_KEY="MIIEvQIBADANBgkq..."
   ```

### Production (Vercel)

1. Go to your Vercel project dashboard
2. Navigate to **Settings** → **Environment Variables**
3. Add three environment variables:

   | Name                    | Value                            | Environment                      |
   | ----------------------- | -------------------------------- | -------------------------------- |
   | `FIREBASE_PROJECT_ID`   | your-project-id                  | Production, Preview, Development |
   | `FIREBASE_CLIENT_EMAIL` | firebase-adminsdk-xxxxx@...      | Production, Preview, Development |
   | `FIREBASE_PRIVATE_KEY`  | -----BEGIN PRIVATE KEY-----\n... | Production, Preview, Development |

4. Click **Save**

**Note**: Vercel handles newlines in environment variables correctly, so you can paste the private key as-is.

## Verifying Setup

### Method 1: Check Server Logs

Restart your dev server:

```bash
npm run dev
```

If credentials are missing, you'll see:

```
Missing Firebase Admin credentials. Required environment variables:
- FIREBASE_PROJECT_ID: ✗
- FIREBASE_CLIENT_EMAIL: ✗
- FIREBASE_PRIVATE_KEY: ✗
```

If configured correctly, no error will appear.

### Method 2: Test Authentication

1. Sign in with Google in your app
2. Check the Network tab for `/api/users/me`
3. Should return `200 OK` with user data

If you see `401 Unauthorized`, check:

- Environment variables are set correctly
- Private key includes `\n` newline characters
- Private key is wrapped in quotes
- Dev server was restarted after adding env vars

## Troubleshooting

### Error: "Service account object must contain a string 'project_id' property"

**Cause**: `FIREBASE_PROJECT_ID` is not set or is empty

**Fix**: Add the project ID from your service account JSON to `.env`

### Error: "Invalid service account credential"

**Cause**: `FIREBASE_PRIVATE_KEY` is malformed

**Fix**:

1. Re-copy the `private_key` from the JSON file
2. Ensure it includes `\n` characters
3. Wrap in double quotes
4. Don't modify the key in any way

### Error: "Firebase app named '[DEFAULT]' already exists"

**Cause**: Multiple instances of the app trying to initialize

**Fix**: Restart your dev server. The code handles this with a singleton pattern.

### Error: "Invalid token" or "Token expired"

**Cause**:

1. Clock skew between client/server
2. User needs to sign in again
3. Token was revoked

**Fix**:

1. Sign out and sign in again
2. Check system time is correct
3. Clear browser cache

## Security Best Practices

1. **Never commit the service account JSON file**
   - Add `*-firebase-adminsdk-*.json` to `.gitignore`

2. **Never commit the private key to version control**
   - Keep it only in `.env` (which is in `.gitignore`)

3. **Rotate keys periodically**
   - Delete old service accounts from Firebase Console
   - Generate new keys every 90 days

4. **Use separate service accounts for dev/prod**
   - Create different service accounts for different environments

5. **Restrict service account permissions**
   - By default, the Firebase Admin SDK has full project access
   - In production, consider using a custom service account with limited permissions

## Additional Resources

- [Firebase Admin SDK Documentation](https://firebase.google.com/docs/admin/setup)
- [Service Account Best Practices](https://cloud.google.com/iam/docs/best-practices-for-managing-service-account-keys)
- [Firebase Authentication](https://firebase.google.com/docs/auth)

## Need Help?

If you're still having issues:

1. Double-check the format of `FIREBASE_PRIVATE_KEY`
2. Ensure you restarted the dev server after adding env vars
3. Verify the service account JSON file is from the correct Firebase project
4. Check the server console logs for detailed error messages
