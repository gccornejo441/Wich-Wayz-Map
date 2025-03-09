import { describe, it, expect, vi, beforeEach } from "vitest";
import { getShopCountsByUser } from "../../src/services/userLeaderboardService";
import { executeQuery } from "../../src/services/apiClient";

vi.mock("../../src/services/apiClient", () => ({
  executeQuery: vi.fn(),
}));

describe("getShopCountsByUser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should fetch shop counts by user", async () => {
    const mockData = {
      rows: [
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
      ],
    };

    (executeQuery as jest.Mock).mockResolvedValue(mockData);

    const result = await getShopCountsByUser();

    expect(executeQuery).toHaveBeenCalledTimes(1);
    expect(result).toEqual(mockData.rows);
  });

  it("should return users with no shops and a shopCount of 0", async () => {
    const mockData = {
      rows: [
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
      ],
    };

    (executeQuery as jest.Mock).mockResolvedValue(mockData);

    const result = await getShopCountsByUser();

    expect(executeQuery).toHaveBeenCalledTimes(1);
    expect(result).toEqual(mockData.rows);
    expect(result.some((user) => user.shopCount === 0)).toBe(true);
  });
});
