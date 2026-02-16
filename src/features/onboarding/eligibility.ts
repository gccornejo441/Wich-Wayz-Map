import { OnboardingState } from "./types";

export const isEligible = (
  state: OnboardingState | null,
  now: number,
  version: string,
): boolean => {
  if (!state) return true;
  if (state.version !== version) return true;
  if (state.seen) return false;
  if (typeof state.snoozeUntil === "number" && state.snoozeUntil > now) {
    return false;
  }
  return true;
};
