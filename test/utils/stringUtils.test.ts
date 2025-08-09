import { describe, it, expect } from "vitest";
import { toTitleCase, cleanString } from "../../src/utils/stringUtils";

describe("stringUtils", () => {
  it("toTitleCase trims and handles apostrophes and hyphens", () => {
    expect(toTitleCase("   o'neal   johnson ")).toBe("O'Neal Johnson");
    expect(toTitleCase("mary-jane")).toBe("Mary-Jane");
  });

  it("cleanString trims and formats input", () => {
    expect(cleanString("  hello WORLD  ")).toBe("Hello World");
    expect(cleanString("greetings from space", "sentence")).toBe(
      "Greetings from space",
    );
  });
});
