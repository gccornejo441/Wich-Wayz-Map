export const getLocale = (): string => {
  const langs = (
    navigator.languages && navigator.languages.length
      ? navigator.languages
      : [navigator.language]
  ).filter(Boolean) as string[];

  const primary = (langs[0] || "en-US").toLowerCase();
  if (primary.startsWith("en")) return "en-US";
  return "en-US";
};
