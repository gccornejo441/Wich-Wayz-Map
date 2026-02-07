import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockAuthApiRequest = vi.fn();

vi.mock("../../src/services/apiClient", () => ({
  authApiRequest: mockAuthApiRequest,
  apiRequest: vi.fn(),
}));

const { getMyCollections, getPublicCollection } =
  await import("../../src/services/collectionService");

describe("collectionService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("parses shop ids and counts from my collections", async () => {
    mockAuthApiRequest.mockResolvedValue([
      {
        id: 1,
        user_id: 9,
        name: "Favorites",
        visibility: "private",
        shop_ids: "2,3,5",
        shop_count: 3,
      },
    ]);

    const collections = await getMyCollections();
    expect(collections).toHaveLength(1);
    expect(collections[0].shopIds).toEqual([2, 3, 5]);
    expect(collections[0].shopCount).toBe(3);
  });

  it("maps public collection shops with coordinates", async () => {
    mockAuthApiRequest.mockResolvedValue({
      id: 12,
      user_id: 2,
      name: "Downtown",
      visibility: "public",
      shops: [
        {
          id: 5,
          name: "Sample Shop",
          created_by: 2,
          locations: [
            {
              id: 50,
              latitude: 40.71,
              longitude: -74.0,
              street_address: "123 Main",
              city: "NYC",
              state: "NY",
              country: "USA",
              postal_code: "10001",
            },
          ],
          categories: [{ id: 1, category_name: "Sandwiches" }],
        },
      ],
    });

    const collection = await getPublicCollection(12);
    expect(collection.id).toBe(12);
    expect(collection.shops).toHaveLength(1);
    expect(collection.shops[0].locations?.[0].latitude).toBeCloseTo(40.71);
    expect(collection.shopIds).toEqual([5]);
  });
});
