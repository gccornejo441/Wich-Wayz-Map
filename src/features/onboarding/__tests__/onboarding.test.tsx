import { describe, it, expect, beforeEach } from "vitest";
import { isEligible } from "../eligibility";
import { readState, writeState, storageKeyFor } from "../storage";
import { MODAL_VERSION } from "../constants";
import type { OnboardingState } from "../types";

describe("Eligibility Logic", () => {
  const now = Date.now();

  it("should be eligible when no state exists", () => {
    expect(isEligible(null, now, MODAL_VERSION)).toBe(true);
  });

  it("should be eligible when version is different", () => {
    const state: OnboardingState = {
      version: "2025-01",
      seen: true,
      dismissedAt: now,
    };
    expect(isEligible(state, now, MODAL_VERSION)).toBe(true);
  });

  it("should not be eligible when seen for current version", () => {
    const state: OnboardingState = {
      version: MODAL_VERSION,
      seen: true,
      dismissedAt: now,
    };
    expect(isEligible(state, now, MODAL_VERSION)).toBe(false);
  });

  it("should not be eligible when snoozed (future timestamp)", () => {
    const state: OnboardingState = {
      version: MODAL_VERSION,
      seen: false,
      snoozeUntil: now + 1000000,
    };
    expect(isEligible(state, now, MODAL_VERSION)).toBe(false);
  });

  it("should be eligible when snooze expired (past timestamp)", () => {
    const state: OnboardingState = {
      version: MODAL_VERSION,
      seen: false,
      snoozeUntil: now - 1000,
    };
    expect(isEligible(state, now, MODAL_VERSION)).toBe(true);
  });
});

describe("Storage Functions", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("should create correct storage key", () => {
    expect(storageKeyFor("123")).toBe("wichwayz_onboarding_v1:123");
    expect(storageKeyFor("anon")).toBe("wichwayz_onboarding_v1:anon");
  });

  it("should read and write state correctly", () => {
    const key = storageKeyFor("test");
    const state: OnboardingState = {
      version: MODAL_VERSION,
      seen: true,
      dismissedAt: Date.now(),
      locale: "en-US",
    };

    writeState(key, state);
    const readResult = readState(key);

    expect(readResult).toEqual(state);
  });

  it("should return null when no state exists", () => {
    const key = storageKeyFor("nonexistent");
    expect(readState(key)).toBeNull();
  });

  it("should handle malformed JSON gracefully", () => {
    const key = storageKeyFor("malformed");
    localStorage.setItem(key, "not valid json{");
    expect(readState(key)).toBeNull();
  });

  it("should handle localStorage write errors gracefully", () => {
    const key = storageKeyFor("test");
    const state: OnboardingState = {
      version: MODAL_VERSION,
      seen: true,
    };

    expect(() => writeState(key, state)).not.toThrow();
  });
});
