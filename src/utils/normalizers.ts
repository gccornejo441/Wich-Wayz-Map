import { US_STATES } from "@constants/usStates";

export const normalizeZip = (v: string | undefined | null): string => {
  const trimmed = (v ?? "").trim();
  if (!trimmed) return "";
  const digitsOnly = trimmed.replace(/\D/g, "");
  return digitsOnly.slice(0, 9);
};

export const normalizeState = (input: string | undefined | null): string => {
  const s = (input ?? "").trim();
  if (!s) return "";

  const upper = s.toUpperCase();
  const byCode = US_STATES.find((x) => x.code === upper);
  if (byCode) return byCode.code;

  const lower = s.toLowerCase();
  const byName = US_STATES.find((x) => x.name.toLowerCase() === lower);
  return byName ? byName.code : "";
};

export const coerceNumber = (v: unknown): number => {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const trimmed = v.trim();
    if (!trimmed) return 0;
    const n = parseFloat(trimmed);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
};
