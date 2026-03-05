/**
 * IP Blacklist System
 *
 * Manages a dynamic blacklist of IP addresses that have shown
 * malicious behavior (repeated rate limit violations, low reCAPTCHA scores).
 *
 * NOTE: This is an in-memory solution. For persistent blocking across
 * deployments/restarts, consider using a database or Redis.
 */

import { getViolationCount, resetViolations } from "./rateLimiter.js";

// Blacklist structure: Map<IP, { reason, blockedAt, expiresAt, violations }>
const ipBlacklist = new Map();

// Track low reCAPTCHA scores: Map<IP, Array<{ score, timestamp }>>
const lowScoreTracker = new Map();

/**
 * Check if IP auto-blocking is enabled.
 * @returns {boolean}
 */
const isAutoBlockEnabled = () => {
  return process.env.IP_AUTO_BLOCK_ENABLED !== "false";
};

/**
 * Get block duration in milliseconds.
 * @returns {number}
 */
const getBlockDuration = () => {
  const hours = parseInt(process.env.IP_AUTO_BLOCK_DURATION_HOURS || "24", 10);
  return hours * 60 * 60 * 1000;
};

/**
 * Check if an IP is blacklisted.
 *
 * @param {string} ip - IP address to check
 * @returns {Object|null} Blacklist entry or null if not blocked
 */
export const isBlacklisted = (ip) => {
  if (!isAutoBlockEnabled()) {
    return null;
  }

  const entry = ipBlacklist.get(ip);
  if (!entry) {
    return null;
  }

  // Check if block has expired
  if (Date.now() > entry.expiresAt) {
    ipBlacklist.delete(ip);
    resetViolations(ip);
    console.error(`[IPBlacklist] IP ${ip} block expired and was removed`);
    return null;
  }

  return entry;
};

/**
 * Add an IP to the blacklist.
 *
 * @param {string} ip - IP address to block
 * @param {string} reason - Reason for blocking
 * @param {number} [customDuration] - Custom block duration in ms
 */
export const addToBlacklist = (ip, reason, customDuration = null) => {
  if (!isAutoBlockEnabled()) {
    console.error(
      `[IPBlacklist] Auto-blocking disabled. Would have blocked IP ${ip}: ${reason}`,
    );
    return;
  }

  const duration = customDuration || getBlockDuration();
  const now = Date.now();

  const entry = {
    reason,
    blockedAt: now,
    expiresAt: now + duration,
    violations: getViolationCount(ip),
  };

  ipBlacklist.set(ip, entry);

  const expiresInHours = Math.round(duration / (60 * 60 * 1000));
  console.error(
    `[IPBlacklist] Blocked IP ${ip}: ${reason} (expires in ${expiresInHours}h, violations: ${entry.violations})`,
  );
};

/**
 * Remove an IP from the blacklist (manual unblock).
 *
 * @param {string} ip - IP address to unblock
 * @returns {boolean} True if IP was in blacklist
 */
export const removeFromBlacklist = (ip) => {
  const existed = ipBlacklist.delete(ip);
  if (existed) {
    resetViolations(ip);
    console.error(`[IPBlacklist] Manually unblocked IP ${ip}`);
  }
  return existed;
};

/**
 * Record a low reCAPTCHA score for an IP.
 * Auto-blocks if too many low scores are detected.
 *
 * @param {string} ip - IP address
 * @param {number} score - reCAPTCHA score (0.0-1.0)
 */
export const recordLowScore = (ip, score) => {
  if (!isAutoBlockEnabled()) {
    return;
  }

  // Only track very low scores (likely bots)
  if (score >= 0.2) {
    return;
  }

  if (!lowScoreTracker.has(ip)) {
    lowScoreTracker.set(ip, []);
  }

  const scores = lowScoreTracker.get(ip);
  const now = Date.now();
  const oneHourAgo = now - 60 * 60 * 1000;

  // Add new score
  scores.push({ score, timestamp: now });

  // Clean up old scores (older than 1 hour)
  const recentScores = scores.filter((s) => s.timestamp > oneHourAgo);
  lowScoreTracker.set(ip, recentScores);

  // Check threshold
  const threshold = parseInt(
    process.env.IP_AUTO_BLOCK_LOW_SCORE_COUNT || "5",
    10,
  );

  if (recentScores.length >= threshold) {
    const avgScore =
      recentScores.reduce((sum, s) => sum + s.score, 0) / recentScores.length;
    addToBlacklist(
      ip,
      `Multiple low reCAPTCHA scores (${recentScores.length} in 1h, avg: ${avgScore.toFixed(2)})`,
    );
    lowScoreTracker.delete(ip); // Clear tracker
  }
};

/**
 * Check if IP should be auto-blocked based on rate limit violations.
 *
 * @param {string} ip - IP address
 * @returns {boolean} True if IP should be blocked
 */
export const shouldAutoBlock = (ip) => {
  if (!isAutoBlockEnabled()) {
    return false;
  }

  const threshold = parseInt(process.env.IP_AUTO_BLOCK_THRESHOLD || "50", 10);
  const violations = getViolationCount(ip);

  if (violations >= threshold) {
    addToBlacklist(ip, `Excessive rate limit violations (${violations})`);
    return true;
  }

  return false;
};

/**
 * Middleware to check IP blacklist.
 * Rejects requests from blacklisted IPs.
 *
 * @returns {Function} Express middleware
 */
export const withIpBlacklist = () => {
  return (req, res, next) => {
    const ip =
      req.headers["x-forwarded-for"]?.split(",")[0].trim() ||
      req.headers["x-real-ip"] ||
      req.socket?.remoteAddress ||
      "unknown";

    const blacklistEntry = isBlacklisted(ip);

    if (blacklistEntry) {
      const expiresIn = Math.ceil(
        (blacklistEntry.expiresAt - Date.now()) / (60 * 1000),
      ); // minutes

      console.error(
        `[IPBlacklist] Blocked request from ${ip}: ${blacklistEntry.reason}`,
      );

      return res.status(403).json({
        error: "Access denied. Your IP has been temporarily blocked.",
        code: "IP_BLOCKED",
        reason: blacklistEntry.reason,
        expiresInMinutes: expiresIn,
      });
    }

    next();
  };
};

/**
 * Get blacklist statistics.
 *
 * @returns {Object} Statistics
 */
export const getBlacklistStats = () => {
  const now = Date.now();
  const stats = {
    totalBlocked: ipBlacklist.size,
    activeBlocks: 0,
    expiredBlocks: 0,
    blockedIPs: [],
  };

  for (const [ip, entry] of ipBlacklist.entries()) {
    const isActive = now <= entry.expiresAt;

    if (isActive) {
      stats.activeBlocks++;
      stats.blockedIPs.push({
        ip,
        reason: entry.reason,
        blockedAt: new Date(entry.blockedAt).toISOString(),
        expiresAt: new Date(entry.expiresAt).toISOString(),
        violations: entry.violations,
      });
    } else {
      stats.expiredBlocks++;
    }
  }

  return stats;
};

/**
 * Get list of IPs with low reCAPTCHA scores (for monitoring).
 *
 * @returns {Array} List of suspicious IPs
 */
export const getSuspiciousIPs = () => {
  const suspicious = [];
  const now = Date.now();
  const oneHourAgo = now - 60 * 60 * 1000;

  for (const [ip, scores] of lowScoreTracker.entries()) {
    const recentScores = scores.filter((s) => s.timestamp > oneHourAgo);

    if (recentScores.length > 0) {
      const avgScore =
        recentScores.reduce((sum, s) => sum + s.score, 0) / recentScores.length;

      suspicious.push({
        ip,
        scoreCount: recentScores.length,
        avgScore: avgScore.toFixed(2),
        lowestScore: Math.min(...recentScores.map((s) => s.score)).toFixed(2),
      });
    }
  }

  // Sort by score count (most suspicious first)
  suspicious.sort((a, b) => b.scoreCount - a.scoreCount);

  return suspicious;
};

/**
 * Cleanup expired entries periodically.
 */
export const cleanupBlacklist = () => {
  const now = Date.now();
  let removedCount = 0;

  for (const [ip, entry] of ipBlacklist.entries()) {
    if (now > entry.expiresAt) {
      ipBlacklist.delete(ip);
      resetViolations(ip);
      removedCount++;
    }
  }

  // Clean up old low score entries (older than 24 hours)
  const dayAgo = now - 24 * 60 * 60 * 1000;

  for (const [ip, scores] of lowScoreTracker.entries()) {
    const recentScores = scores.filter((s) => s.timestamp > dayAgo);

    if (recentScores.length === 0) {
      lowScoreTracker.delete(ip);
    } else {
      lowScoreTracker.set(ip, recentScores);
    }
  }

  console.error(
    `[IPBlacklist] Cleanup complete. Removed ${removedCount} expired blocks. Active blocks: ${ipBlacklist.size}`,
  );
};

/**
 * Get all blacklisted IPs (for admin dashboard).
 *
 * @returns {Array} List of blacklisted IPs with details
 */
export const getBlacklistedIPs = () => {
  const now = Date.now();
  const list = [];

  for (const [ip, entry] of ipBlacklist.entries()) {
    const remainingMs = entry.expiresAt - now;
    const remainingHours = Math.max(0, remainingMs / (60 * 60 * 1000));

    list.push({
      ip,
      reason: entry.reason,
      blockedAt: new Date(entry.blockedAt).toISOString(),
      expiresAt: new Date(entry.expiresAt).toISOString(),
      remainingHours: remainingHours.toFixed(1),
      violations: entry.violations,
      isExpired: remainingMs <= 0,
    });
  }

  // Sort by most recent blocks first
  list.sort((a, b) => b.blockedAt - a.blockedAt);

  return list;
};

// Run cleanup every hour in production
if (process.env.NODE_ENV === "production") {
  setInterval(cleanupBlacklist, 60 * 60 * 1000); // 1 hour
}
