import { describe, expect, it } from "vitest";
import { normalizeBrandKey } from "../../server/api/lib/brandKey.js";

describe("normalizeBrandKey", () => {
  it("normalizes case and punctuation", () => {
    expect(normalizeBrandKey("Joe's Deli!")).toBe("joes deli");
  });

  it("removes store numbering tokens", () => {
    expect(normalizeBrandKey("Subway #1234")).toBe("subway");
    expect(normalizeBrandKey("Subway No. 12")).toBe("subway");
  });

  it("removes diacritics and trims whitespace", () => {
    expect(normalizeBrandKey("  Caf\u00e9 D\u00e9li  ")).toBe("cafe deli");
  });

  it("returns empty key for empty input", () => {
    expect(normalizeBrandKey("")).toBe("");
    expect(normalizeBrandKey(undefined)).toBe("");
  });
});
