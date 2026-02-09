import { describe, expect, it } from "vitest";
import {
  MODERATION_ACTIONS,
  MODERATOR_OUTCOMES,
  REPORT_REASON_ACTION_MAP,
  REPORT_REASON_DEFINITIONS,
  REPORT_REASON_ORDER,
} from "@constants/moderationPolicy";

describe("moderationPolicy", () => {
  it("defines the exact supported report reasons", () => {
    expect(REPORT_REASON_ORDER).toEqual([
      "spam",
      "wrong_location",
      "closed",
      "duplicate",
    ]);
  });

  it("maps each report reason to the expected actions", () => {
    expect(REPORT_REASON_ACTION_MAP.spam).toEqual(["hide_shop", "unlist_shop"]);
    expect(REPORT_REASON_ACTION_MAP.wrong_location).toEqual([
      "update_location_data",
    ]);
    expect(REPORT_REASON_ACTION_MAP.closed).toEqual(["update_location_status"]);
    expect(REPORT_REASON_ACTION_MAP.duplicate).toEqual([
      "mark_canonical",
      "hide_duplicate",
    ]);
  });

  it("has metadata for every mapped action", () => {
    REPORT_REASON_ORDER.forEach((reason) => {
      REPORT_REASON_ACTION_MAP[reason].forEach((action) => {
        expect(MODERATION_ACTIONS[action]).toBeDefined();
      });
    });
  });

  it("has metadata for each reason and a valid outcome", () => {
    REPORT_REASON_ORDER.forEach((reason) => {
      const reasonDefinition = REPORT_REASON_DEFINITIONS[reason];
      expect(reasonDefinition).toBeDefined();
      expect(
        MODERATOR_OUTCOMES[reasonDefinition.moderatorOutcome],
      ).toBeDefined();
    });
  });
});
