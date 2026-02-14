import {
  applyCollisionSuffix,
  generateRedditStyleUsername,
  sanitizeUsername,
  validateUsername,
} from "./username.js";

const isUsernameConflictError = (error) => {
  const message =
    error instanceof Error
      ? error.message.toLowerCase()
      : String(error).toLowerCase();

  return (
    message.includes("unique constraint") &&
    (message.includes("username") ||
      message.includes("ux_users_username_lower"))
  );
};

const createFallbackBase = () =>
  sanitizeUsername(`user-${Math.random().toString(36).slice(2, 12)}`);

export const reserveUniqueGeneratedUsername = async (
  insertWithUsername,
  { maxAttempts = 10, fallbackAttempts = 5 } = {},
) => {
  if (typeof insertWithUsername !== "function") {
    throw new Error("insertWithUsername must be a function");
  }

  let base = generateRedditStyleUsername();

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const candidate = applyCollisionSuffix(base, attempt);
    const validation = validateUsername(candidate);

    if (!validation.ok) {
      base = generateRedditStyleUsername();
      continue;
    }

    try {
      await insertWithUsername(candidate);
      return candidate;
    } catch (error) {
      if (!isUsernameConflictError(error)) {
        throw error;
      }

      if (attempt % 2 === 1) {
        base = generateRedditStyleUsername();
      }
    }
  }

  for (
    let fallbackAttempt = 0;
    fallbackAttempt < fallbackAttempts;
    fallbackAttempt += 1
  ) {
    const fallbackCandidate = applyCollisionSuffix(
      createFallbackBase(),
      fallbackAttempt,
    );
    const validation = validateUsername(fallbackCandidate);

    if (!validation.ok) {
      continue;
    }

    try {
      await insertWithUsername(fallbackCandidate);
      return fallbackCandidate;
    } catch (error) {
      if (!isUsernameConflictError(error)) {
        throw error;
      }
    }
  }

  throw new Error("Unable to generate a unique username");
};
