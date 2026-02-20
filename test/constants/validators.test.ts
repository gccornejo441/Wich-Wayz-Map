import { describe, expect, it } from "vitest";
import { locationSchema } from "@constants/validators";

const buildValidData = () => ({
  shopName: "Test Shop",
  shop_description: "A test shop with at least 20 characters for validation",
  city: "Raleigh",
  state: "NC",
  postcode: "27502",
  latitude: 35.9,
  longitude: -78.8,
  categoryIds: [1],
  chain_attestation: "no" as const,
  estimated_location_count: "lt10" as const,
  eligibility_confirmed: true,
});

describe("locationSchema - postcode transform and validation", () => {
  it("accepts ZIP5", async () => {
    await expect(
      locationSchema.validate(buildValidData()),
    ).resolves.toBeDefined();
  });

  it("accepts ZIP+4 and transforms to 9 digits", async () => {
    const result = await locationSchema.validate({
      ...buildValidData(),
      postcode: "27502-1234",
    });
    expect(result.postcode).toBe("275021234");
  });

  it("rejects invalid ZIP length", async () => {
    await expect(
      locationSchema.validate({
        ...buildValidData(),
        postcode: "275021",
      }),
    ).rejects.toThrow("Zip code must be 5 or 9 digits");
  });
});

describe("locationSchema - state transform", () => {
  it("normalizes state to 2-letter uppercase code", async () => {
    const result = await locationSchema.validate({
      ...buildValidData(),
      state: " north carolina ",
    });
    expect(result.state).toBe("NC");
  });

  it("requires a valid state", async () => {
    await expect(
      locationSchema.validate({
        ...buildValidData(),
        state: "InvalidState",
      }),
    ).rejects.toThrow("State is required");
  });
});

describe("locationSchema - eligibility enforcement", () => {
  it("rejects explicit chain/franchise submissions", async () => {
    await expect(
      locationSchema.validate({
        ...buildValidData(),
        chain_attestation: "yes",
      }),
    ).rejects.toThrow(
      "Chains/franchises/10+ locations are not allowed on Wich Wayz.",
    );
  });

  it("rejects explicit 10+ location submissions", async () => {
    await expect(
      locationSchema.validate({
        ...buildValidData(),
        estimated_location_count: "gte10",
      }),
    ).rejects.toThrow(
      "Chains/franchises/10+ locations are not allowed on Wich Wayz.",
    );
  });

  it("requires eligibility confirmation", async () => {
    await expect(
      locationSchema.validate({
        ...buildValidData(),
        eligibility_confirmed: false,
      }),
    ).rejects.toThrow("You must confirm this shop is eligible to submit");
  });
});

describe("locationSchema - complete payload", () => {
  it("validates a complete payload", async () => {
    const result = await locationSchema.validate({
      ...buildValidData(),
      website_url: "https://example.com",
      phone: "(919) 555-1234",
      address: "123 Main St",
      address_first: "123 Main St",
      address_second: "Suite 100",
      house_number: "123",
      country: "USA",
      postcode: "27502-1234",
    });

    expect(result.shopName).toBe("Test Shop");
    expect(result.postcode).toBe("275021234");
    expect(result.state).toBe("NC");
  });
});
