import admin from "firebase-admin";

// Initialize Firebase Admin SDK (singleton pattern)
if (!admin.apps.length) {
  try {
    const serviceAccount = {
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      // Handle escaped newlines in private key
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    };

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });

    console.log("Firebase Admin SDK initialized successfully");
  } catch (error) {
    console.error("Failed to initialize Firebase Admin SDK:", error);
    throw error;
  }
}

/**
 * Verifies a Firebase ID token and returns the decoded token payload
 * @param {string} token - Firebase ID token to verify
 * @returns {Promise<{uid: string, email: string}|null>} Decoded token with uid and email, or null if invalid
 */
export const verifyFirebaseToken = async (token) => {
  try {
    const decodedToken = await admin.auth().verifyIdToken(token);
    return {
      uid: decodedToken.uid,
      email: decodedToken.email || null,
    };
  } catch (error) {
    console.error("Firebase token verification failed:", error.message);
    return null;
  }
};

export default admin;