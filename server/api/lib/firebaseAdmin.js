import admin from "firebase-admin";

let adminApp;

export const getFirebaseAdmin = () => {
  if (!adminApp) {
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY;

    if (!projectId || !clientEmail || !privateKey) {
      console.error(
        "Missing Firebase Admin credentials. Required environment variables:",
      );
      console.error("- FIREBASE_PROJECT_ID:", projectId ? "✓" : "✗");
      console.error("- FIREBASE_CLIENT_EMAIL:", clientEmail ? "✓" : "✗");
      console.error("- FIREBASE_PRIVATE_KEY:", privateKey ? "✓" : "✗");
      throw new Error(
        "Firebase Admin SDK credentials not configured. " +
          "Please set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY environment variables.",
      );
    }

    adminApp = admin.initializeApp({
      credential: admin.credential.cert({
        projectId,
        clientEmail,
        privateKey: privateKey.replace(/\\n/g, "\n"),
      }),
    });
  }
  return adminApp;
};

export const verifyFirebaseToken = async (idToken) => {
  try {
    const admin = getFirebaseAdmin();
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    return decodedToken;
  } catch (error) {
    console.error("Token verification failed:");
    console.error("- Error code:", error.code);
    console.error("- Error message:", error.message);
    console.error("- Token preview:", idToken?.substring(0, 50) + "...");
    throw error;
  }
};
