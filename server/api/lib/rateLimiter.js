/**
 * Rate Limiter Middleware
 *
 * In-memory rate limiting based on IP address.
 * Tracks request counts per IP in sliding time windows.
 *
 * NOTE: This is an in-memory solution suitable for single-server deployments.
 * For multi-server/serverless, consider Redis or Vercel KV.
 */

// In-memory store: Map<IP, Map<action, Array<timestamp>>>
const rateLimitStore = new Map();

// Store for violation counts (used for auto-blocking)
const violationStore = new Map();

/**
 * Get client IP address from request.
 * Handles proxy headers (x-forwarded-for) and direct connections.
 *
 * @param {Object} req - Request object
 * @returns {string} IP address
 */
export const getClientIp = (req) => {
  // Check for proxy headers first (Vercel, Cloudflare, etc.)
  const forwarded = req.headers["x-forwarded-for"];
  if (forwarded) {
    // x-forwarded-for can contain multiple IPs, take the first one
    return forwarded.split(",")[0].trim();
  }

  // Check other common proxy headers
  const realIp = req.headers["x-real-ip"];
  if (realIp) {
    return realIp.trim();
  }

  // Fall back to direct connection IP
  return req.socket?.remoteAddress || "unknown";
};

/**
 * Get rate limit configuration for an action.
 *
 * @param {string} action - The action being rate limited
 * @returns {Object} Rate limit config
 */
const getRateLimitConfig = (action) => {
  const defaults = {
    register: { maxRequests: 5, windowMs: 60 * 60 * 1000 }, // 5 per hour
    login: { maxRequests: 10, windowMs: 60 * 60 * 1000 }, // 10 per hour
    vote: { maxRequests: 50, windowMs: 60 * 60 * 1000 }, // 50 per hour
    submit_shop: { maxRequests: 10, windowMs: 60 * 60 * 1000 }, // 10 per hour
    reset_password: { maxRequests: 3, windowMs: 60 * 60 * 1000 }, // 3 per hour
  };

  const config = defaults[action] || {
    maxRequests: 100,
    windowMs: 15 * 60 * 1000,
  }; // Default: 100 per 15 min

  // Check for environment variable overrides
  const envKey = `RATE_LIMIT_${action.toUpperCase()}_PER_HOUR`;
  const envValue = process.env[envKey];

  if (envValue) {
    const parsed = parseInt(envValue, 10);
    if (!isNaN(parsed) && parsed > 0) {
      config.maxRequests = parsed;
    }
  }

  return config;
};

/**
 * Clean up old entries from the rate limit store.
 * Removes timestamps outside the current window.
 *
 * @param {string} ip - IP address
 * @param {string} action - Action being limited
 * @param {number} windowMs - Time window in milliseconds
 */
const cleanupOldEntries = (ip, action, windowMs) => {
  const now = Date.now();
  const cutoff = now - windowMs;

  const ipStore = rateLimitStore.get(ip);
  if (!ipStore) return;

  const timestamps = ipStore.get(action);
  if (!timestamps) return;

  // Filter out timestamps outside the window
  const validTimestamps = timestamps.filter((ts) => ts > cutoff);

  if (validTimestamps.length === 0) {
    ipStore.delete(action);
    if (ipStore.size === 0) {
      rateLimitStore.delete(ip);
    }
  } else {
    ipStore.set(action, validTimestamps);
  }
};

/**
 * Check if IP is within rate limit for an action.
 *
 * @param {string} ip - IP address
 * @param {string} action - Action being limited
 * @returns {Object} Rate limit status
 */
export const checkRateLimit = (ip, action) => {
  const config = getRateLimitConfig(action);
  const now = Date.now();

  // Initialize store for this IP if needed
  if (!rateLimitStore.has(ip)) {
    rateLimitStore.set(ip, new Map());
  }

  const ipStore = rateLimitStore.get(ip);

  // Initialize action timestamps if needed
  if (!ipStore.has(action)) {
    ipStore.set(action, []);
  }

  // Clean up old entries
  cleanupOldEntries(ip, action, config.windowMs);

  const timestamps = ipStore.get(action);
  const requestCount = timestamps.length;

  // Check if limit exceeded
  if (requestCount >= config.maxRequests) {
    // Find when the oldest request will expire
    const oldestTimestamp = Math.min(...timestamps);
    const resetTime = oldestTimestamp + config.windowMs;
    const retryAfter = Math.ceil((resetTime - now) / 1000); // seconds

    return {
      allowed: false,
      limit: config.maxRequests,
      remaining: 0,
      reset: resetTime,
      retryAfter,
    };
  }

  // Add current timestamp
  timestamps.push(now);

  return {
    allowed: true,
    limit: config.maxRequests,
    remaining: config.maxRequests - timestamps.length,
    reset: now + config.windowMs,
  };
};

/**
 * Record a rate limit violation for auto-blocking.
 *
 * @param {string} ip - IP address
 */
export const recordViolation = (ip) => {
  const count = violationStore.get(ip) || 0;
  violationStore.set(ip, count + 1);

  const threshold = parseInt(process.env.IP_AUTO_BLOCK_THRESHOLD || "50", 10);

  if (count + 1 >= threshold) {
    console.error(
      `[RateLimit] IP ${ip} reached violation threshold (${count + 1}/${threshold})`,
    );
    // This will be used by IP blacklist system
    return true; // Should be blocked
  }

  return false;
};

/**
 * Get violation count for an IP.
 *
 * @param {string} ip - IP address
 * @returns {number} Violation count
 */
export const getViolationCount = (ip) => {
  return violationStore.get(ip) || 0;
};

/**
 * Reset violation count for an IP.
 *
 * @param {string} ip - IP address
 */
export const resetViolations = (ip) => {
  violationStore.delete(ip);
};

/**
 * Rate limiting middleware.
 *
 * @param {string} action - The action to rate limit
 * @returns {Function} Express middleware
 */
export const withRateLimit = (action) => {
  return (req, res, next) => {
    const ip = getClientIp(req);

    // Skip rate limiting for localhost in development
    if (
      process.env.NODE_ENV === "development" &&
      (ip === "127.0.0.1" || ip === "::1" || ip === "::ffff:127.0.0.1")
    ) {
      return next();
    }

    const result = checkRateLimit(ip, action);

    // Set rate limit headers (useful for clients)
    res.setHeader("X-RateLimit-Limit", result.limit);
    res.setHeader("X-RateLimit-Remaining", result.remaining);
    res.setHeader("X-RateLimit-Reset", new Date(result.reset).toISOString());

    if (!result.allowed) {
      // Record violation
      const shouldBlock = recordViolation(ip);

      if (shouldBlock) {
        console.error(
          `[RateLimit] IP ${ip} should be auto-blocked (too many violations)`,
        );
      }

      res.setHeader("Retry-After", result.retryAfter);

      console.error(
        `[RateLimit] Rate limit exceeded for IP ${ip}, action=${action}, retryAfter=${result.retryAfter}s`,
      );

      return res.status(429).json({
        error: "Too many requests. Please try again later.",
        code: "RATE_LIMIT_EXCEEDED",
        retryAfter: result.retryAfter,
        limit: result.limit,
      });
    }

    next();
  };
};

/**
 * Periodic cleanup function to remove old entries.
 * Should be called periodically (e.g., every hour).
 */
export const cleanupRateLimitStore = () => {
  const now = Date.now();
  const maxAge = 24 * 60 * 60 * 1000; // 24 hours

  for (const [ip, ipStore] of rateLimitStore.entries()) {
    for (const [action, timestamps] of ipStore.entries()) {
      const validTimestamps = timestamps.filter((ts) => now - ts < maxAge);

      if (validTimestamps.length === 0) {
        ipStore.delete(action);
      } else {
        ipStore.set(action, validTimestamps);
      }
    }

    if (ipStore.size === 0) {
      rateLimitStore.delete(ip);
    }
  }

  console.error(
    `[RateLimit] Cleanup complete. Active IPs: ${rateLimitStore.size}`,
  );
};

/**
 * Get rate limit statistics (for monitoring/admin dashboard).
 *
 * @returns {Object} Statistics
 */
export const getRateLimitStats = () => {
  const stats = {
    totalIPs: rateLimitStore.size,
    totalViolations: 0,
    topOffenders: [],
  };

  // Count total violations
  for (const [ip, count] of violationStore.entries()) {
    stats.totalViolations += count;
    stats.topOffenders.push({ ip, violations: count });
  }

  // Sort by violation count
  stats.topOffenders.sort((a, b) => b.violations - a.violations);
  stats.topOffenders = stats.topOffenders.slice(0, 10); // Top 10

  return stats;
};

// Run cleanup every hour in production
if (process.env.NODE_ENV === "production") {
  setInterval(cleanupRateLimitStore, 60 * 60 * 1000); // 1 hour
}
