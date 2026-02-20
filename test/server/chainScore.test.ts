import { describe, expect, it } from "vitest";
import { scoreChainLikelihood } from "../../server/api/lib/chainScore.js";

describe("scoreChainLikelihood", () => {
  it("blocks when internal count is at least 10", () => {
    const result = scoreChainLikelihood({
      shopName: "Example Sandwiches",
      internalCount: 10,
    });

    expect(result.decision).toBe("block");
    expect(result.reasons).toContain("internal_brand_count_at_least_10");
  });

  it("routes to review for medium confidence", () => {
    const result = scoreChainLikelihood({
      shopName: "Example Cafe #12",
      internalCount: 6,
      websiteUrl: "https://example.com/store-locator",
      chainAttestation: "unsure",
      estimatedLocationCount: "unsure",
    });

    expect(result.decision).toBe("review");
    expect(result.score).toBeGreaterThanOrEqual(50);
  });

  it("allows likely independent shops", () => {
    const result = scoreChainLikelihood({
      shopName: "Tiny Sandwich Co",
      internalCount: 0,
      chainAttestation: "no",
      estimatedLocationCount: "lt10",
    });

    expect(result.decision).toBe("allow");
    expect(result.score).toBeLessThan(50);
  });

  it("blocks when submitter self-reports chain/franchise", () => {
    const result = scoreChainLikelihood({
      shopName: "Any Brand",
      chainAttestation: "yes",
    });

    expect(result.decision).toBe("block");
    expect(result.reasons).toContain("self_reported_chain_or_franchise");
  });
});
