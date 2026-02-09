import { describe, expect, it } from "vitest";
import { shopReportSchema } from "@constants/validators";

describe("shopReportSchema", () => {
  it("accepts valid report reasons", async () => {
    const result = await shopReportSchema.validate({
      reason: "wrong_location",
      details: "Pin points to the wrong side of town.",
    });

    expect(result.reason).toBe("wrong_location");
  });

  it("rejects invalid report reasons", async () => {
    await expect(
      shopReportSchema.validate({
        reason: "fake_reason",
      }),
    ).rejects.toThrow("Select a valid report reason");
  });

  it("enforces details max length", async () => {
    await expect(
      shopReportSchema.validate({
        reason: "spam",
        details: "A".repeat(1001),
      }),
    ).rejects.toThrow("Details must be 1000 characters or fewer");
  });
});
