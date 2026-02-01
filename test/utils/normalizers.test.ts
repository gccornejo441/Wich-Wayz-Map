import { describe, it, expect } from "vitest";
import {
  normalizeZip,
  normalizeState,
  coerceNumber,
} from "@/utils/normalizers";

describe("normalizeZip", () => {
  it("should return 5-digit ZIP unchanged", () => {
    expect(normalizeZip("27502")).toBe("27502");
  });

  it("should strip hyphen from ZIP+4 and return 9 digits", () => {
    expect(normalizeZip("27502-1234")).toBe("275021234");
  });

  it("should remove spaces and non-digits", () => {
    expect(normalizeZip(" 27 502 ")).toBe("27502");
    expect(normalizeZip("27-502")).toBe("27502");
  });

  it("should return empty string for empty/null/undefined", () => {
    expect(normalizeZip("")).toBe("");
    expect(normalizeZip(null)).toBe("");
    expect(normalizeZip(undefined)).toBe("");
  });

  it("should return empty string for non-digit input", () => {
    expect(normalizeZip("abc")).toBe("");
    expect(normalizeZip("!@#$")).toBe("");
  });

  it("should truncate to first 9 digits if longer", () => {
    expect(normalizeZip("275021234567890")).toBe("275021234");
  });

  it("should handle mixed alphanumeric input", () => {
    expect(normalizeZip("27A502B1234")).toBe("275021234");
  });
});

describe("normalizeState", () => {
  it("should normalize 2-letter code to uppercase", () => {
    expect(normalizeState("nc")).toBe("NC");
    expect(normalizeState("NC")).toBe("NC");
    expect(normalizeState("Ca")).toBe("CA");
  });

  it("should convert full state name to 2-letter code", () => {
    expect(normalizeState("North Carolina")).toBe("NC");
    expect(normalizeState("north carolina")).toBe("NC");
    expect(normalizeState("California")).toBe("CA");
    expect(normalizeState("california")).toBe("CA");
  });

  it("should handle whitespace", () => {
    expect(normalizeState(" north carolina ")).toBe("NC");
    expect(normalizeState("  NC  ")).toBe("NC");
  });

  it("should return empty string for invalid state", () => {
    expect(normalizeState("Invalid")).toBe("");
    expect(normalizeState("ZZ")).toBe("");
    expect(normalizeState("123")).toBe("");
  });

  it("should return empty string for empty/null/undefined", () => {
    expect(normalizeState("")).toBe("");
    expect(normalizeState(null)).toBe("");
    expect(normalizeState(undefined)).toBe("");
  });

  it("should handle all 50 states by name", () => {
    expect(normalizeState("Texas")).toBe("TX");
    expect(normalizeState("New York")).toBe("NY");
    expect(normalizeState("Florida")).toBe("FL");
  });
});

describe("coerceNumber", () => {
  it("should return finite number unchanged", () => {
    expect(coerceNumber(35.99)).toBe(35.99);
    expect(coerceNumber(0)).toBe(0);
    expect(coerceNumber(-10.5)).toBe(-10.5);
  });

  it("should parse valid numeric string", () => {
    expect(coerceNumber("35.99")).toBe(35.99);
    expect(coerceNumber("0")).toBe(0);
    expect(coerceNumber("-10.5")).toBe(-10.5);
  });

  it("should return 0 for empty string", () => {
    expect(coerceNumber("")).toBe(0);
    expect(coerceNumber("  ")).toBe(0);
  });

  it("should return 0 for non-numeric string", () => {
    expect(coerceNumber("abc")).toBe(0);
    expect(coerceNumber("not a number")).toBe(0);
  });

  it("should return 0 for NaN", () => {
    expect(coerceNumber(NaN)).toBe(0);
  });

  it("should return 0 for Infinity", () => {
    expect(coerceNumber(Infinity)).toBe(0);
    expect(coerceNumber(-Infinity)).toBe(0);
  });

  it("should return 0 for null/undefined", () => {
    expect(coerceNumber(null)).toBe(0);
    expect(coerceNumber(undefined)).toBe(0);
  });

  it("should parse string with leading/trailing whitespace", () => {
    expect(coerceNumber("  42.5  ")).toBe(42.5);
  });

  it("should return 0 for objects and arrays", () => {
    expect(coerceNumber({})).toBe(0);
    expect(coerceNumber([])).toBe(0);
    expect(coerceNumber([1, 2, 3])).toBe(0);
  });
});
