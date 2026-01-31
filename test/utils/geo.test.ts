import { describe, expect, it } from "vitest";
import { distanceMiles } from "../../src/utils/geo";

describe("distanceMiles", () => {
  it("returns zero for identical coordinates", () => {
    expect(distanceMiles([-73.9857, 40.7484], [-73.9857, 40.7484])).toBe(0);
  });

  it("computes realistic long distances (NYC to LA)", () => {
    const miles = distanceMiles([-73.9857, 40.7484], [-118.2437, 34.0522]);
    expect(miles).toBeGreaterThan(2400);
    expect(miles).toBeLessThan(2500);
    expect(miles).toBeCloseTo(2446, 0);
  });

  it("computes mid-range distances (SF to LA)", () => {
    const miles = distanceMiles([-122.4194, 37.7749], [-118.2437, 34.0522]);
    expect(miles).toBeGreaterThan(300);
    expect(miles).toBeLessThan(400);
    expect(miles).toBeCloseTo(347, 0);
  });

  it("returns Infinity when inputs are invalid", () => {
    expect(distanceMiles([NaN as unknown as number, 0], [0, 0])).toBe(Infinity);
    expect(distanceMiles([0, 0], [Infinity, 0])).toBe(Infinity);
  });
});
