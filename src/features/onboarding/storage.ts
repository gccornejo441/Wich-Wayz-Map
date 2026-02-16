import { STORAGE_PREFIX } from "./constants";
import { OnboardingState } from "./types";

export const storageKeyFor = (userKey: string): string => {
  return `${STORAGE_PREFIX}:${userKey}`;
};

export const readState = (key: string): OnboardingState | null => {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as OnboardingState;
  } catch {
    return null;
  }
};

export const writeState = (key: string, state: OnboardingState): void => {
  try {
    localStorage.setItem(key, JSON.stringify(state));
  } catch {
    return;
  }
};
