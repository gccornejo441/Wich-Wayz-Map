/**
 * reCAPTCHA v3 Validator
 *
 * Verifies reCAPTCHA tokens with Google and returns risk scores.
 * Score ranges: 0.0 (definite bot) to 1.0 (definite human)
 *
 * @see https://developers.google.com/recaptcha/docs/v3
 */

const RECAPTCHA_VERIFY_URL = "https://www.google.com/recaptcha/api/siteverify";

/**
 * Get minimum score threshold for an action from environment variables.
 * @param {string} action - The action to get threshold for
 * @returns {number} Minimum score (0.0-1.0)
 */
const getMinScoreForAction = (action) => {
  const defaults = {
    register: 0.5,
    login: 0.3,
    submit_shop: 0.5,
    vote: 0.4,
    reset_password: 0.3,
  };

  const envKey = `RECAPTCHA_${action.toUpperCase()}_MIN_SCORE`;
  const envValue = process.env[envKey];

  if (envValue) {
    const parsed = parseFloat(envValue);
    if (!isNaN(parsed) && parsed >= 0 && parsed <= 1) {
      return parsed;
    }
  }

  return defaults[action] || 0.5;
};

/**
 * Verify a reCAPTCHA v3 token with Google's API.
 *
 * @param {string} token - The reCAPTCHA response token from the client
 * @param {string} expectedAction - The expected action (e.g., 'register', 'login')
 * @param {number} [customMinScore] - Optional custom minimum score (overrides env config)
 * @returns {Promise<Object>} Verification result
 * @returns {boolean} result.success - Whether verification succeeded
 * @returns {number} result.score - Risk score (0.0-1.0)
 * @returns {string} result.action - The action from the token
 * @returns {boolean} result.isHuman - Whether the user passes the threshold
 * @returns {string} [result.error] - Error message if verification failed
 * @returns {Array<string>} [result.errorCodes] - Error codes from reCAPTCHA API
 */
export const verifyRecaptchaV3 = async (
  token,
  expectedAction,
  customMinScore = null,
) => {
  const secretKey = process.env.RECAPTCHA_SECRET_KEY;

  if (!secretKey) {
    console.error("[reCAPTCHA] RECAPTCHA_SECRET_KEY not configured");
    return {
      success: false,
      score: 0,
      action: null,
      isHuman: false,
      error: "reCAPTCHA not configured on server",
    };
  }

  if (!token || typeof token !== "string") {
    return {
      success: false,
      score: 0,
      action: null,
      isHuman: false,
      error: "Missing or invalid reCAPTCHA token",
    };
  }

  try {
    // Call Google's verification API
    const response = await fetch(RECAPTCHA_VERIFY_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        secret: secretKey,
        response: token,
      }).toString(),
    });

    if (!response.ok) {
      console.error(
        `[reCAPTCHA] HTTP error: ${response.status} ${response.statusText}`,
      );
      return {
        success: false,
        score: 0,
        action: null,
        isHuman: false,
        error: "reCAPTCHA verification service unavailable",
      };
    }

    const data = await response.json();

    // Log verification details for monitoring
    console.error(
      `[reCAPTCHA] Verification result: success=${data.success}, score=${data.score}, action=${data.action}, expected=${expectedAction}`,
    );

    if (!data.success) {
      console.error(
        "[reCAPTCHA] Verification failed:",
        data["error-codes"] || "Unknown error",
      );
      return {
        success: false,
        score: 0,
        action: data.action || null,
        isHuman: false,
        error: "reCAPTCHA verification failed",
        errorCodes: data["error-codes"] || [],
      };
    }

    // Check if action matches
    if (data.action !== expectedAction) {
      console.error(
        `[reCAPTCHA] Action mismatch: expected="${expectedAction}", got="${data.action}"`,
      );
      return {
        success: false,
        score: data.score || 0,
        action: data.action,
        isHuman: false,
        error: "Action mismatch",
      };
    }

    // Determine minimum score threshold
    const minScore =
      customMinScore !== null
        ? customMinScore
        : getMinScoreForAction(expectedAction);

    const score = data.score || 0;
    const isHuman = score >= minScore;

    // Log low scores for monitoring potential bot attacks
    if (score < 0.3) {
      console.error(
        `[reCAPTCHA] Low score detected: ${score} for action="${expectedAction}" (threshold=${minScore})`,
      );
    }

    return {
      success: true,
      score,
      action: data.action,
      isHuman,
      hostname: data.hostname,
      challengeTimestamp: data.challenge_ts,
    };
  } catch (error) {
    console.error("[reCAPTCHA] Verification error:", error);
    return {
      success: false,
      score: 0,
      action: null,
      isHuman: false,
      error: error.message || "Verification failed",
    };
  }
};

/**
 * Middleware wrapper for reCAPTCHA verification.
 * Extracts token from request body and verifies it.
 *
 * @param {string} action - The expected action
 * @param {number} [minScore] - Optional custom minimum score
 * @returns {Function} Express middleware
 */
export const withRecaptcha = (action, minScore = null) => {
  return async (req, res, next) => {
    const token = req.body?.recaptchaToken;

    if (!token) {
      return res.status(400).json({
        error: "reCAPTCHA token required",
        code: "RECAPTCHA_TOKEN_MISSING",
      });
    }

    const result = await verifyRecaptchaV3(token, action, minScore);

    if (!result.success) {
      return res.status(400).json({
        error: result.error || "reCAPTCHA verification failed",
        code: "RECAPTCHA_VERIFICATION_FAILED",
      });
    }

    if (!result.isHuman) {
      // Log potential bot for monitoring
      console.error(
        `[reCAPTCHA] Bot detected: score=${result.score}, action=${action}, IP=${req.headers["x-forwarded-for"] || req.socket.remoteAddress}`,
      );

      return res.status(403).json({
        error: "Verification failed. Please try again.",
        code: "RECAPTCHA_LOW_SCORE",
        score: result.score, // Include score for debugging in dev (remove in prod)
      });
    }

    // Attach verification result to request for logging/monitoring
    req.recaptchaScore = result.score;

    next();
  };
};

/**
 * Check if reCAPTCHA is properly configured.
 * @returns {boolean} True if configured
 */
export const isRecaptchaConfigured = () => {
  return !!process.env.RECAPTCHA_SECRET_KEY;
};
