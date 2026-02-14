const MIN_USERNAME_LENGTH = 3;
const MAX_USERNAME_LENGTH = 20;
const SUFFIX_LENGTH = 4;
const SUFFIX_SEPARATOR_LENGTH = 1;
const MAX_BASE_LENGTH_WITH_SUFFIX =
  MAX_USERNAME_LENGTH - SUFFIX_SEPARATOR_LENGTH - SUFFIX_LENGTH;

const ALLOWED_USERNAME_REGEX = /^[A-Za-z0-9_-]+$/;
const WHITESPACE_REGEX = /\s/;
const WHITESPACE_GLOBAL_REGEX = /\s+/g;
const INVALID_CHAR_REGEX = /[^a-z0-9_-]/g;
const EDGE_SEPARATOR_REGEX = /^[_-]+|[_-]+$/g;

const ADJECTIVES = [
  "swift",
  "quiet",
  "brave",
  "mellow",
  "crisp",
  "steady",
  "gentle",
  "lucky",
  "nimble",
  "bold",
  "calm",
  "clever",
  "daring",
  "eager",
  "fierce",
  "jolly",
  "kind",
  "lively",
  "noble",
  "plucky",
  "sly",
  "tidy",
  "vivid",
  "witty",
  "zesty",
  "bright",
  "cozy",
  "dusty",
  "fuzzy",
  "rapid",
];

const NOUNS = [
  "otter",
  "river",
  "cactus",
  "falcon",
  "harbor",
  "willow",
  "pine",
  "ember",
  "summit",
  "comet",
  "meadow",
  "forest",
  "thunder",
  "breeze",
  "anchor",
  "trail",
  "brook",
  "grove",
  "lark",
  "badger",
  "maple",
  "shore",
  "orbit",
  "ridge",
  "hollow",
  "delta",
  "valley",
  "raven",
  "spruce",
  "harvest",
];

const toSeedNumber = (seed) => {
  let hash = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    hash ^= seed.charCodeAt(i);
    hash +=
      (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
  }
  return hash >>> 0;
};

const createSeededRandom = (seedNumber) => {
  let state = seedNumber || 1;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
};

const pickRandom = (list, randomFn) => {
  const index = Math.floor(randomFn() * list.length);
  return list[index];
};

const resolveSeparator = (value) => {
  if (value.includes("_") && !value.includes("-")) {
    return "_";
  }
  return "-";
};

const formatSuffix = (attempt) => {
  const numericAttempt = Math.abs(Math.trunc(attempt)) % 10000;
  return String(numericAttempt).padStart(4, "0");
};

export const validateUsername = (username) => {
  if (typeof username !== "string") {
    return { ok: false, reason: "Username must be a string" };
  }

  if (
    username.length < MIN_USERNAME_LENGTH ||
    username.length > MAX_USERNAME_LENGTH
  ) {
    return { ok: false, reason: "Username must be 3-20 characters long" };
  }

  if (WHITESPACE_REGEX.test(username)) {
    return { ok: false, reason: "Username cannot contain whitespace" };
  }

  if (!ALLOWED_USERNAME_REGEX.test(username)) {
    return { ok: false, reason: "Username contains invalid characters" };
  }

  return { ok: true };
};

export const sanitizeUsername = (username) => {
  const raw = typeof username === "string" ? username : "";

  let sanitized = raw
    .trim()
    .toLowerCase()
    .replace(WHITESPACE_GLOBAL_REGEX, "")
    .replace(INVALID_CHAR_REGEX, "_")
    .replace(/[_-]{2,}/g, (match) => match[0])
    .replace(EDGE_SEPARATOR_REGEX, "")
    .slice(0, MAX_USERNAME_LENGTH);

  if (sanitized.length >= MIN_USERNAME_LENGTH) {
    return sanitized;
  }

  sanitized = `${sanitized}usr`.slice(0, MIN_USERNAME_LENGTH);
  if (sanitized.length < MIN_USERNAME_LENGTH) {
    sanitized = "usr";
  }

  return sanitized;
};

export const applyCollisionSuffix = (base, attempt) => {
  const normalizedBase = sanitizeUsername(base);
  if (attempt <= 0) {
    return normalizedBase.slice(0, MAX_USERNAME_LENGTH);
  }

  const separator = resolveSeparator(normalizedBase);
  const suffix = formatSuffix(attempt);
  let truncatedBase = normalizedBase.slice(0, MAX_BASE_LENGTH_WITH_SUFFIX);
  truncatedBase = truncatedBase.replace(EDGE_SEPARATOR_REGEX, "");

  if (truncatedBase.length < MIN_USERNAME_LENGTH) {
    truncatedBase = "usr";
  }

  return `${truncatedBase}${separator}${suffix}`;
};

export const generateRedditStyleUsername = (seed) => {
  const randomFn =
    typeof seed === "string" && seed.length > 0
      ? createSeededRandom(toSeedNumber(seed))
      : Math.random;

  const adjective = pickRandom(ADJECTIVES, randomFn);
  const noun = pickRandom(NOUNS, randomFn);
  const separator = randomFn() < 0.5 ? "-" : "_";
  const base = sanitizeUsername(`${adjective}${separator}${noun}`);
  const includeSuffix = randomFn() < 0.35;

  if (!includeSuffix) {
    return applyCollisionSuffix(base, 0);
  }

  const randomSuffixAttempt = Math.floor(randomFn() * 10000) + 1;
  return applyCollisionSuffix(base, randomSuffixAttempt);
};
