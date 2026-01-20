import { describe, it, expect, vi, beforeEach, Mock } from "vitest";
import { getShopCountsByUser } from "../../src/services/userLeaderboardService";
import { apiRequest } from "../../src/services/apiClient";

vi.mock("../../src/services/apiClient", () => ({
  apiRequest: vi.fn(),
}));

describe("getShopCountsByUser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should fetch shop counts by user", async () => {
    const mockData = [
      {
        userId: 1,
        email: "user1@example.com",
        shopCount: 5,
        avatar: "avatar1.png",
      },
      {
        userId: 2,
        email: "user2@example.com",
        shopCount: 2,
        avatar: "avatar2.png",
      },
    ];

    (apiRequest as Mock).mockResolvedValue(mockData);

    const result = await getShopCountsByUser();

    expect(apiRequest).toHaveBeenCalledTimes(1);
    expect(result).toEqual(mockData);
  });

  it("should return users with no shops and a shopCount of 0", async () => {
    const mockData = [
      {
        userId: 1,
        email: "user1@example.com",
        shopCount: 5,
        avatar: "avatar1.png",
      },
      {
        userId: 2,
        email: "user2@example.com",
        shopCount: 0,
        avatar: "avatar2.png",
      },
    ];

    (apiRequest as Mock).mockResolvedValue(mockData);

    const result = await getShopCountsByUser();

    expect(apiRequest).toHaveBeenCalledTimes(1);
    expect(result).toEqual(mockData);
    expect(result.some((user) => user.shopCount === 0)).toBe(true);
  });
});
