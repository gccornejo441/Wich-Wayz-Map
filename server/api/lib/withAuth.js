import { verifyFirebaseToken } from "./firebaseAdmin.js";
import { getTursoClient } from "./turso.js";

export const withAuth = (handler) => {
  return async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Missing authorization header" });
    }

    try {
      const idToken = authHeader.slice(7);
      const decoded = await verifyFirebaseToken(idToken);

      req.firebaseUser = {
        uid: decoded.uid,
        email: decoded.email ?? null,
        emailVerified: !!decoded.email_verified,
        signInProvider: decoded.firebase?.sign_in_provider ?? null,
      };

      return handler(req, res);
    } catch (error) {
      console.error("Token verification failed:", error);
      return res.status(401).json({ error: "Invalid or expired token" });
    }
  };
};

export const withDbUser = (handler) => {
  return withAuth(async (req, res) => {
    const turso = await getTursoClient();

    const result = await turso.execute({
      sql: "SELECT * FROM users WHERE firebase_uid = ?",
      args: [req.firebaseUser.uid],
    });

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    const user = result.rows[0];

    if (user.account_status === "deleted") {
      return res.status(410).json({ error: "Account deleted" });
    }

    if (user.account_status === "suspended") {
      return res.status(403).json({ error: "Account suspended" });
    }

    req.dbUser = {
      id: user.id,
      role: user.role,
      accountStatus: user.account_status,
      membershipStatus: user.membership_status,
      verified: user.verified,
    };

    return handler(req, res);
  });
};

export const withActiveAccount = (handler) => {
  return withDbUser(async (req, res) => {
    if (req.dbUser.accountStatus !== "active") {
      return res.status(403).json({
        error: "Account must be active for this operation",
      });
    }
    return handler(req, res);
  });
};

export const withRole = (allowedRoles) => {
  return (handler) =>
    withDbUser(async (req, res) => {
      if (!allowedRoles.includes(req.dbUser.role)) {
        return res.status(403).json({ error: "Insufficient permissions" });
      }
      return handler(req, res);
    });
};
