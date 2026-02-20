import { normalizeBrandKey } from "./brandKey.js";

const BLOCK_THRESHOLD = 80;
const REVIEW_THRESHOLD = 50;

const KNOWN_CHAIN_BRANDS = new Set(
  [
    "arbys",
    "au bon pain",
    "blimpie",
    "charleys cheesesteaks",
    "corner bakery cafe",
    "dunkin",
    "einstein bros bagels",
    "firehouse subs",
    "jersey mikes",
    "jersey mikes subs",
    "jimmie johns",
    "jimmy johns",
    "mcalisters deli",
    "panera",
    "panera bread",
    "potbelly",
    "pret a manger",
    "quiznos",
    "schlotzskys",
    "subway",
    "togo",
    "togos",
    "wich wich",
  ].map((value) => normalizeBrandKey(value)),
);

const STORE_LOCATOR_PATTERN =
  /(locations?|store-locator|storelocator|find-a-store|our-stores|storefinder)/i;
const STORE_NUMBER_PATTERN =
  /\b(?:#\s*\d{1,5}|store\s*\d{1,5}|unit\s*\d{1,5}|location\s*\d{1,5})\b/i;

const toSafeInteger = (value) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return 0;
  }
  return Math.trunc(parsed);
};

const clampScore = (value) => Math.max(0, Math.min(100, value));

/**
 * Heuristic chain/franchise scoring used by add-new-shop enforcement.
 */
export function scoreChainLikelihood({
  shopName,
  websiteUrl,
  internalCount = 0,
  chainAttestation = "unsure",
  estimatedLocationCount = "unsure",
  knownBrandStatus = "unknown",
  knownLocationCount = 0,
}) {
  const reasons = [];
  let score = 0;

  const normalizedBrandKey = normalizeBrandKey(shopName);
  const safeInternalCount = toSafeInteger(internalCount);
  const safeKnownLocationCount = toSafeInteger(knownLocationCount);

  if (knownBrandStatus === "blocked") {
    return {
      score: 100,
      decision: "block",
      reasons: ["brand_already_blocked"],
    };
  }

  if (chainAttestation === "yes") {
    return {
      score: 100,
      decision: "block",
      reasons: ["self_reported_chain_or_franchise"],
    };
  }

  if (estimatedLocationCount === "gte10") {
    return {
      score: 100,
      decision: "block",
      reasons: ["self_reported_10_plus_locations"],
    };
  }

  if (safeInternalCount >= 10) {
    return {
      score: 100,
      decision: "block",
      reasons: ["internal_brand_count_at_least_10"],
    };
  }

  if (safeKnownLocationCount >= 10) {
    return {
      score: 100,
      decision: "block",
      reasons: ["known_brand_count_at_least_10"],
    };
  }

  if (safeInternalCount >= 5) {
    score += 30;
    reasons.push("internal_brand_count_between_5_and_9");
  }

  if (safeKnownLocationCount >= 5) {
    score += 35;
    reasons.push("known_brand_count_between_5_and_9");
  }

  if (knownBrandStatus === "needs_review") {
    score += 30;
    reasons.push("brand_marked_needs_review");
  }

  if (KNOWN_CHAIN_BRANDS.has(normalizedBrandKey)) {
    score += 80;
    reasons.push("known_chain_match");
  }

  if (STORE_NUMBER_PATTERN.test(String(shopName ?? ""))) {
    score += 10;
    reasons.push("store_number_pattern");
  }

  if (STORE_LOCATOR_PATTERN.test(String(websiteUrl ?? ""))) {
    score += 20;
    reasons.push("website_store_locator_pattern");
  }

  if (chainAttestation === "unsure") {
    score += 10;
    reasons.push("submitter_unsure_chain_status");
  }

  if (estimatedLocationCount === "unsure") {
    score += 5;
    reasons.push("submitter_unsure_location_count");
  }

  const normalizedScore = clampScore(score);
  const decision =
    normalizedScore >= BLOCK_THRESHOLD
      ? "block"
      : normalizedScore >= REVIEW_THRESHOLD
        ? "review"
        : "allow";

  return {
    score: normalizedScore,
    decision,
    reasons,
  };
}
