import { titleCase } from "title-case";

/**
 * Converts a string to title case, where the first letter of each word
 * is capitalized and the rest are in lowercase.
 *
 * @param str - The input string to be converted.
 * @returns A new string in title case.
 */
export function toTitleCase(str: string): string {
  return str
    .toLowerCase()
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

/**
 * Converts a string to sentence case: First letter capitalized, rest lowercase,
 * while ensuring pronouns and proper nouns are capitalized according to English grammar.
 *
 * @param str - The input string to be converted.
 * @returns A string with proper sentence case formatting.
 */
export function toSentenceCase(str: string): string {
  if (!str) return "";

  const lowerCased = str.trim().toLowerCase();

  let sentenceCased = lowerCased.charAt(0).toUpperCase() + lowerCased.slice(1);

  sentenceCased = sentenceCased
    .split(". ")
    .map((sentence) => titleCase(sentence, { sentenceCase: true }))
    .join(". ");

  return sentenceCased;
}

/**
 * Cleans the input string by trimming whitespace and converting
 * it to title case. If the input is null or undefined, returns
 * an empty string.
 *
 * @param value - The string to be cleaned.
 * @returns The cleaned string in title case or an empty string if
 *          the input is null or undefined.
 */
export function cleanString(
  value: string | null | undefined,
  format: "title" | "sentence" = "title",
): string {
  if (!value) return "";
  const trimmed = value.trim();
  return format === "title" ? toTitleCase(trimmed) : toSentenceCase(trimmed);
}
