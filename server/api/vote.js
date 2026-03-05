import { withActiveAccount } from "./lib/withAuth.js";
import { getTursoClient } from "./lib/turso.js";
import { withRateLimit } from "./lib/rateLimiter.js";
import { withRecaptcha } from "./lib/recaptchaValidator.js";
import { withIpBlacklist } from "./lib/ipBlacklist.js";
import { recordLowScore } from "./lib/ipBlacklist.js";
import { getClientIp } from "./lib/rateLimiter.js";

async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { shop_id, upvote, downvote, recaptchaToken } = req.body;
  const userId = req.dbUser.id;

  if (!shop_id || (upvote === undefined && downvote === undefined)) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  // Track low reCAPTCHA scores for bot detection
  if (req.recaptchaScore && req.recaptchaScore < 0.2) {
    const ip = getClientIp(req);
    recordLowScore(ip, req.recaptchaScore);
  }

  try {
    const turso = await getTursoClient();

    const query = `
      INSERT INTO votes (shop_id, user_id, upvote, downvote)
      VALUES (?, ?, ?, ?)
      ON CONFLICT (shop_id, user_id) DO UPDATE
      SET upvote = excluded.upvote, downvote = excluded.downvote
    `;

    await turso.execute({
      sql: query,
      args: [shop_id, userId, upvote || 0, downvote || 0],
    });

    return res.status(200).json({ message: "Vote submitted successfully" });
  } catch (error) {
    console.error("Error recording vote:", error);

    if (error.message?.includes("UNIQUE constraint")) {
      return res.status(409).json({ error: "Vote conflict" });
    }

    return res.status(500).json({ error: "Failed to record vote" });
  }
}

// Apply security middleware stack: IP blacklist → Rate limit → reCAPTCHA → Auth → Handler
export default withIpBlacklist()(
  withRateLimit("vote")(withRecaptcha("vote")(withActiveAccount(handler))),
);
