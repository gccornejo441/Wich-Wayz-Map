export interface OnboardingState {
  version: string;
  seen: boolean;
  dismissedAt?: number;
  snoozeUntil?: number;
  variant?: "A" | "B";
  locale?: string;
}
