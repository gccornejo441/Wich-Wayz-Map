import { describe, it, expect } from "vitest";
import { locationSchema } from "@constants/validators";

describe("locationSchema - postcode transform and validation", () => {
  it("should accept ZIP5 after transform", async () => {
    const data = {
      shopName: "Test Shop",
      shop_description:
        "A test shop with at least 20 characters for validation",
      postcode: "27502",
      latitude: 35.9,
      longitude: -78.8,
    };

    await expect(locationSchema.validate(data)).resolves.toBeDefined();
  });

  it("should accept ZIP+4 and transform to 9 digits", async () => {
    const data = {
      shopName: "Test Shop",
      shop_description:
        "A test shop with at least 20 characters for validation",
      postcode: "27502-1234",
      latitude: 35.9,
      longitude: -78.8,
    };

    const result = await locationSchema.validate(data);
    expect(result.postcode).toBe("275021234");
  });

  it("should accept ZIP5 with trailing hyphen after transform", async () => {
    const data = {
      shopName: "Test Shop",
      shop_description:
        "A test shop with at least 20 characters for validation",
      postcode: "27502-",
      latitude: 35.9,
      longitude: -78.8,
    };

    const result = await locationSchema.validate(data);
    expect(result.postcode).toBe("27502");
  });

  it("should fail for 4-digit ZIP", async () => {
    const data = {
      shopName: "Test Shop",
      shop_description:
        "A test shop with at least 20 characters for validation",
      postcode: "2750",
      latitude: 35.9,
      longitude: -78.8,
    };

    await expect(locationSchema.validate(data)).rejects.toThrow(
      "Zip code must be 5 or 9 digits",
    );
  });

  it("should fail for 6-digit ZIP", async () => {
    const data = {
      shopName: "Test Shop",
      shop_description:
        "A test shop with at least 20 characters for validation",
      postcode: "275021",
      latitude: 35.9,
      longitude: -78.8,
    };

    await expect(locationSchema.validate(data)).rejects.toThrow(
      "Zip code must be 5 or 9 digits",
    );
  });

  it("should fail when postcode is missing", async () => {
    const data = {
      shopName: "Test Shop",
      shop_description:
        "A test shop with at least 20 characters for validation",
      latitude: 35.9,
      longitude: -78.8,
    };

    await expect(locationSchema.validate(data)).rejects.toThrow(
      "Zip code is required",
    );
  });

  it("should strip non-digits before validation", async () => {
    const data = {
      shopName: "Test Shop",
      shop_description:
        "A test shop with at least 20 characters for validation",
      postcode: "27 502",
      latitude: 35.9,
      longitude: -78.8,
    };

    const result = await locationSchema.validate(data);
    expect(result.postcode).toBe("27502");
  });
});

describe("locationSchema - state transform", () => {
  it("should normalize 2-letter state code to uppercase", async () => {
    const data = {
      shopName: "Test Shop",
      shop_description:
        "A test shop with at least 20 characters for validation",
      state: "nc",
      postcode: "27502",
      latitude: 35.9,
      longitude: -78.8,
    };

    const result = await locationSchema.validate(data);
    expect(result.state).toBe("NC");
  });

  it("should convert full state name to 2-letter code", async () => {
    const data = {
      shopName: "Test Shop",
      shop_description:
        "A test shop with at least 20 characters for validation",
      state: "North Carolina",
      postcode: "27502",
      latitude: 35.9,
      longitude: -78.8,
    };

    const result = await locationSchema.validate(data);
    expect(result.state).toBe("NC");
  });

  it("should handle state with whitespace", async () => {
    const data = {
      shopName: "Test Shop",
      shop_description:
        "A test shop with at least 20 characters for validation",
      state: " california ",
      postcode: "90210",
      latitude: 34.0,
      longitude: -118.4,
    };

    const result = await locationSchema.validate(data);
    expect(result.state).toBe("CA");
  });

  it("should return empty string for invalid state", async () => {
    const data = {
      shopName: "Test Shop",
      shop_description:
        "A test shop with at least 20 characters for validation",
      state: "InvalidState",
      postcode: "27502",
      latitude: 35.9,
      longitude: -78.8,
    };

    const result = await locationSchema.validate(data);
    expect(result.state).toBe("");
  });

  it("should accept empty state since it is optional", async () => {
    const data = {
      shopName: "Test Shop",
      shop_description:
        "A test shop with at least 20 characters for validation",
      postcode: "27502",
      latitude: 35.9,
      longitude: -78.8,
    };

    const result = await locationSchema.validate(data);
    expect(result.state).toBeUndefined();
  });
});

describe("locationSchema - required fields", () => {
  it("should require shopName", async () => {
    const data = {
      shop_description:
        "A test shop with at least 20 characters for validation",
      postcode: "27502",
      latitude: 35.9,
      longitude: -78.8,
    };

    await expect(locationSchema.validate(data)).rejects.toThrow(
      "Shop name is required",
    );
  });

  it("should require shop_description", async () => {
    const data = {
      shopName: "Test Shop",
      postcode: "27502",
      latitude: 35.9,
      longitude: -78.8,
    };

    await expect(locationSchema.validate(data)).rejects.toThrow(
      "Shop description is required",
    );
  });

  it("should enforce minimum shop_description length", async () => {
    const data = {
      shopName: "Test Shop",
      shop_description: "Too short",
      postcode: "27502",
      latitude: 35.9,
      longitude: -78.8,
    };

    await expect(locationSchema.validate(data)).rejects.toThrow(
      "Shop description must be at least 20 characters",
    );
  });

  it("should enforce maximum shop_description length", async () => {
    const data = {
      shopName: "Test Shop",
      shop_description: "A".repeat(251),
      postcode: "27502",
      latitude: 35.9,
      longitude: -78.8,
    };

    await expect(locationSchema.validate(data)).rejects.toThrow(
      "Shop description must be at most 250 characters",
    );
  });

  it("should require latitude", async () => {
    const data = {
      shopName: "Test Shop",
      shop_description:
        "A test shop with at least 20 characters for validation",
      postcode: "27502",
      longitude: -78.8,
    };

    await expect(locationSchema.validate(data)).rejects.toThrow(
      "Latitude is required",
    );
  });

  it("should require longitude", async () => {
    const data = {
      shopName: "Test Shop",
      shop_description:
        "A test shop with at least 20 characters for validation",
      postcode: "27502",
      latitude: 35.9,
    };

    await expect(locationSchema.validate(data)).rejects.toThrow(
      "Longitude is required",
    );
  });
});

describe("locationSchema - complete valid payload", () => {
  it("should validate complete shop payload with all fields", async () => {
    const data = {
      shopName: "Awesome Sandwich Shop",
      shop_description:
        "The best sandwiches in town with fresh ingredients daily",
      website_url: "https://example.com",
      phone: "(919) 555-1234",
      address: "123 Main St",
      address_first: "123 Main St",
      address_second: "Suite 100",
      house_number: "123",
      city: "Raleigh",
      state: "North Carolina",
      postcode: "27502-1234",
      country: "USA",
      latitude: 35.7796,
      longitude: -78.6382,
      categoryIds: [1, 2, 3],
    };

    const result = await locationSchema.validate(data);
    expect(result.shopName).toBe("Awesome Sandwich Shop");
    expect(result.state).toBe("NC");
    expect(result.postcode).toBe("275021234");
    expect(result.latitude).toBe(35.7796);
    expect(result.longitude).toBe(-78.6382);
  });
});
