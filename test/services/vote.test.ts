import axios from "axios";
import { vi } from "vitest";
import { GetVotesForShop, InsertVote } from "../../src/services/vote";

vi.mock("axios");

describe("GetVotesForShop", () => {
  it("calls the correct API endpoint and returns data", async () => {
    const mockData = { upvotes: 10, downvotes: 2 };
    (axios.get as jest.Mock).mockResolvedValue({ data: mockData });

    const result = await GetVotesForShop(1);
    expect(axios.get).toHaveBeenCalledWith("/api/votes/1");
    expect(result).toEqual(mockData);
  });

  it("throws an error when the API call fails", async () => {
    (axios.get as jest.Mock).mockRejectedValue(new Error("Network Error"));

    await expect(GetVotesForShop(1)).rejects.toThrow("Network Error");
  });
});

describe("InsertVote", () => {
  it("calls the correct API endpoint with the right payload", async () => {
    const vote = { shop_id: 1, user_id: 123, upvote: true, downvote: false };
    const mockResponse = { success: true };
    (axios.post as jest.Mock).mockResolvedValue({ data: mockResponse });

    const result = await InsertVote(vote);
    expect(axios.post).toHaveBeenCalledWith("/api/vote", vote);
    expect(result).toEqual(mockResponse);
  });

  it("throws an error when the API call fails", async () => {
    (axios.post as jest.Mock).mockRejectedValue(new Error("Network Error"));

    await expect(
      InsertVote({ shop_id: 1, user_id: 123, upvote: true, downvote: false }),
    ).rejects.toThrow("Network Error");
  });
});
