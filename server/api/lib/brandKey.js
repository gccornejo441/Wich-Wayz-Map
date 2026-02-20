const BRAND_KEY_MAX_LENGTH = 80;

/**
 * Builds a deterministic key to group name variants under one brand.
 */
export function normalizeBrandKey(input) {
  const raw = String(input ?? "").trim();
  if (!raw) return "";

  const lowered = raw.toLowerCase();
  const noDiacritics = lowered
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "");

  const canonical = noDiacritics
    .replace(/&/g, " and ")
    .replace(/['"]/g, "")
    .replace(/(?:#\s*\d+|\b(?:no\.?|number)\s*\d+\b)/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return canonical.slice(0, BRAND_KEY_MAX_LENGTH);
}

export function normalizeBrandDisplayName(input) {
  return String(input ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120);
}
