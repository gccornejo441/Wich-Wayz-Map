import { describe, it, expect } from "vitest";
import { toTitleCase, cleanString } from "../../src/utils/stringUtils";

describe("stringUtils", () => {
  it("toTitleCase trims and handles apostrophes and hyphens", () => {
    expect(toTitleCase("   o'neal   johnson ")).toBe("O'Neal Johnson");
    expect(toTitleCase("mary-jane")).toBe("Mary-Jane");
  });

  it("toTitleCase handles possessive apostrophes correctly", () => {
    expect(toTitleCase("alexander's gourmet")).toBe("Alexander's Gourmet");
    expect(toTitleCase("joe's pizza")).toBe("Joe's Pizza");
    expect(toTitleCase("WENDY'S BURGERS")).toBe("Wendy's Burgers");
    expect(toTitleCase("john's sandwich shop")).toBe("John's Sandwich Shop");
    expect(toTitleCase("ALEXANDER'S GOURMET")).toBe("Alexander's Gourmet");
  });

  it("toTitleCase handles Irish names with apostrophes", () => {
    expect(toTitleCase("o'brien's pub")).toBe("O'Brien's Pub");
    expect(toTitleCase("o'neal sandwich shop")).toBe("O'Neal Sandwich Shop");
  });

  it("cleanString trims and formats input", () => {
    expect(cleanString("  hello WORLD  ")).toBe("Hello World");
    expect(cleanString("greetings from space", "sentence")).toBe(
      "Greetings from space",
    );
  });
});
