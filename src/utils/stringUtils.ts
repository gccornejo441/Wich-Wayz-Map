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
 * Cleans the input string by trimming whitespace and converting
 * it to title case. If the input is null or undefined, returns
 * an empty string.
 *
 * @param value - The string to be cleaned.
 * @returns The cleaned string in title case or an empty string if
 *          the input is null or undefined.
 */
export function cleanString(value: string | null | undefined): string {
  if (!value) return "";
  const trimmed = value.trim();
  return toTitleCase(trimmed);
}
