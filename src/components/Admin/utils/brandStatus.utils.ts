import type { BrandStatus } from "../types/admin.types";

export const getBrandStatusClass = (status: BrandStatus): string => {
  switch (status) {
    case "allowed":
      return "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:border-emerald-400/25 dark:bg-emerald-400/10 dark:text-emerald-200";
    case "blocked":
      return "border-red-500/30 bg-red-500/10 text-red-700 dark:border-red-400/25 dark:bg-red-400/10 dark:text-red-200";
    case "needs_review":
      return "border-amber-500/30 bg-amber-500/10 text-amber-800 dark:border-amber-400/25 dark:bg-amber-400/10 dark:text-amber-200";
    case "unknown":
    default:
      return "border-black/10 bg-black/[0.03] text-text-base dark:border-white/10 dark:bg-white/[0.06] dark:text-text-inverted";
  }
};

export const cx = (...classes: Array<string | false | null | undefined>) =>
  classes.filter(Boolean).join(" ");
