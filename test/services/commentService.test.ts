import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  getCommentsForShop,
  setCommentReaction,
} from "../../src/services/commentService";
import * as apiClient from "../../src/services/apiClient";

vi.mock("../../src/services/apiClient", () => ({
  apiRequest: vi.fn(),
  authApiRequest: vi.fn(),
}));

vi.mock("../../src/services/firebase", () => ({
  auth: {
    currentUser: null,
  },
}));

describe("commentService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("normalizes reaction summary and current user reaction from comments", async () => {
    vi.spyOn(apiClient, "apiRequest").mockResolvedValue([
      {
        id: 1,
        shop_id: 8,
        user_id: 14,
        body: "Great place",
        date_created: "2026-02-10T12:00:00Z",
        date_modified: null,
        user_name: "Tester",
        user_avatar: null,
        user_email: "tester@example.com",
        reaction_counts: { like: 4, wow: 2, unknown: 10 },
        user_reaction: "like",
      },
    ]);

    const result = await getCommentsForShop(8);

    expect(apiClient.apiRequest).toHaveBeenCalledWith("/comments/8");
    expect(result).toHaveLength(1);
    expect(result[0].reactionCounts).toEqual({ like: 4, wow: 2 });
    expect(result[0].userReaction).toBe("like");
  });

  it("posts reaction change and normalizes snake_case response", async () => {
    vi.spyOn(apiClient, "authApiRequest").mockResolvedValue({
      reaction_counts: { love: 3, sad: 1, bad: 7 },
      user_reaction: "love",
    });

    const result = await setCommentReaction(22, "love");

    expect(apiClient.authApiRequest).toHaveBeenCalledWith(
      "/comments/22/reaction",
      {
        method: "POST",
        body: JSON.stringify({
          reactionType: "love",
          reaction_type: "love",
        }),
      },
    );
    expect(result).toEqual({
      reactionCounts: { love: 3, sad: 1 },
      userReaction: "love",
    });
  });

  it("supports camelCase reaction response payloads", async () => {
    vi.spyOn(apiClient, "authApiRequest").mockResolvedValue({
      reactionCounts: { haha: 2 },
      userReaction: "haha",
    });

    const result = await setCommentReaction(11, "haha");

    expect(result).toEqual({
      reactionCounts: { haha: 2 },
      userReaction: "haha",
    });
  });
});
