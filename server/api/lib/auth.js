import { jwtVerify } from "jose";

const SECRET =
  process.env.JWT_SECRET ||
  process.env.VITE_JWT_SECRET ||
  process.env.SECRET_PHASE ||
  process.env.SECRET_KEY ||
  null;

const parseUserId = (value) => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
};

/**
 * Attempts to extract the authenticated user's id and role from the request.
 * Falls back to body/query parameters when Authorization header is absent or invalid.
 */
export const extractAuthUser = async (req) => {
  const fromBody = parseUserId(req.body?.userId ?? req.body?.user_id);
  const fromQuery = parseUserId(req.query?.userId ?? req.query?.user_id);
  const role =
    typeof req.body?.role === "string"
      ? req.body.role
      : typeof req.query?.role === "string"
        ? req.query.role
        : null;

  if (fromBody) {
    return { userId: fromBody, role };
  }
  if (fromQuery) {
    return { userId: fromQuery, role };
  }

  const authHeader =
    req.headers?.authorization || req.headers?.Authorization || "";
  if (!authHeader.startsWith("Bearer ") || !SECRET) {
    return { userId: null, role };
  }

  const token = authHeader.slice(7).trim();
  if (!token) return { userId: null, role };

  try {
    const { payload } = await jwtVerify(
      token,
      new TextEncoder().encode(SECRET),
    );
    const tokenUserId = parseUserId(payload.sub);
    const tokenRole =
      typeof payload.role === "string" ? payload.role : (role ?? null);
    return { userId: tokenUserId, role: tokenRole };
  } catch (error) {
    console.error("Failed to verify auth token:", error);
    return { userId: null, role };
  }
};

export default extractAuthUser;
