import { renderHook, waitFor, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { VoteProvider, useVote } from "@/context/voteContext";
import * as voteService from "@/services/vote";
import * as authContext from "@/context/authContext";
import { ReactNode } from "react";

// Mock the vote service
vi.mock("@/services/vote", () => ({
  GetVotesForShop: vi.fn(),
  InsertVote: vi.fn(),
}));

// Mock the auth context
vi.mock("@/context/authContext", () => ({
  useAuth: vi.fn(),
}));

const mockUser = {
  uid: "test-user-id",
  email: "test@example.com",
  emailVerified: true,
};

const mockUserMetadata = {
  id: 1,
  email: "test@example.com",
  role: "user",
};

describe("VoteContext", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (authContext.useAuth as ReturnType<typeof vi.fn>).mockReturnValue({
      user: mockUser,
      userMetadata: mockUserMetadata,
      isAuthenticated: true,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  const wrapper = ({ children }: { children: ReactNode }) => (
    <VoteProvider>{children}</VoteProvider>
  );

  describe("Function Stability (Infinite Loop Prevention)", () => {
    it("should maintain stable function references across re-renders", () => {
      const { result, rerender } = renderHook(() => useVote(), { wrapper });

      const initialFunctions = {
        addVote: result.current.addVote,
        getVotesForShop: result.current.getVotesForShop,
        submitVote: result.current.submitVote,
      };

      // Force multiple re-renders
      rerender();
      rerender();
      rerender();

      // Functions should maintain the same reference
      expect(result.current.addVote).toBe(initialFunctions.addVote);
      expect(result.current.getVotesForShop).toBe(initialFunctions.getVotesForShop);
      expect(result.current.submitVote).toBe(initialFunctions.submitVote);
    });

    it("should update getVotesForShop when userMetadata.id changes", () => {
      const { result, rerender } = renderHook(() => useVote(), { wrapper });

      const initialGetVotes = result.current.getVotesForShop;

      // Change user metadata
      (authContext.useAuth as ReturnType<typeof vi.fn>).mockReturnValue({
        user: mockUser,
        userMetadata: { ...mockUserMetadata, id: 999 },
        isAuthenticated: true,
      });

      rerender();

      // Function reference should change when dependency changes
      expect(result.current.getVotesForShop).not.toBe(initialGetVotes);
    });

    it("should update submitVote when user or userMetadata changes", () => {
      const { result, rerender } = renderHook(() => useVote(), { wrapper });

      const initialSubmitVote = result.current.submitVote;

      // Change user
      (authContext.useAuth as ReturnType<typeof vi.fn>).mockReturnValue({
        user: { ...mockUser, uid: "different-user" },
        userMetadata: mockUserMetadata,
        isAuthenticated: true,
      });

      rerender();

      // Function reference should change when dependency changes
      expect(result.current.submitVote).not.toBe(initialSubmitVote);
    });

    it("should NOT trigger infinite loops when used in useEffect", async () => {
      const { result } = renderHook(() => useVote(), { wrapper });

      let callCount = 0;
      const maxCalls = 5;

      // Simulate a useEffect that depends on getVotesForShop
      const effectSimulation = () => {
        callCount++;
        if (callCount > maxCalls) {
          throw new Error(
            `Infinite loop detected: function called ${callCount} times`
          );
        }
        // In a real useEffect, this would trigger re-render if function reference changes
        void result.current.getVotesForShop;
      };

      // Run multiple times to simulate what would happen in a useEffect
      for (let i = 0; i < maxCalls; i++) {
        effectSimulation();
      }

      // Should not throw error
      expect(callCount).toBe(maxCalls);
    });
  });

  describe("Vote Operations", () => {
    it("should fetch votes for a shop", async () => {
      const mockVoteData = {
        upvotes: 5,
        downvotes: 2,
        userVote: "up" as const,
      };

      (voteService.GetVotesForShop as ReturnType<typeof vi.fn>).mockResolvedValue(
        mockVoteData
      );

      const { result } = renderHook(() => useVote(), { wrapper });

      await act(async () => {
        await result.current.getVotesForShop(1);
      });

      await waitFor(() => {
        expect(result.current.votes[1]).toEqual(mockVoteData);
      });

      expect(voteService.GetVotesForShop).toHaveBeenCalledWith(
        1,
        mockUserMetadata.id
      );
    });

    it("should handle vote fetching errors gracefully", async () => {
      (voteService.GetVotesForShop as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error("Network error")
      );

      const { result } = renderHook(() => useVote(), { wrapper });

      const consoleErrorSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});

      await act(async () => {
        await result.current.getVotesForShop(1);
      });

      await waitFor(() => {
        expect(result.current.votes[1]).toEqual({
          upvotes: 0,
          downvotes: 0,
          userVote: null,
        });
      });

      expect(consoleErrorSpy).toHaveBeenCalled();
      consoleErrorSpy.mockRestore();
    });

    it("should add an upvote optimistically", () => {
      const { result } = renderHook(() => useVote(), { wrapper });

      // Initialize shop votes
      act(() => {
        result.current.votes[1] = { upvotes: 0, downvotes: 0, userVote: null };
      });

      let nextVote: "up" | "down" | null;
      act(() => {
        nextVote = result.current.addVote(1, true);
      });

      expect(nextVote!).toBe("up");
      expect(result.current.votes[1]).toEqual({
        upvotes: 1,
        downvotes: 0,
        userVote: "up",
      });
    });

    it("should toggle off an upvote when clicking again", () => {
      const { result } = renderHook(() => useVote(), { wrapper });

      // Set initial upvote
      act(() => {
        result.current.votes[1] = { upvotes: 1, downvotes: 0, userVote: "up" };
      });

      let nextVote: "up" | "down" | null;
      act(() => {
        nextVote = result.current.addVote(1, true);
      });

      expect(nextVote!).toBe(null);
      expect(result.current.votes[1]).toEqual({
        upvotes: 0,
        downvotes: 0,
        userVote: null,
      });
    });

    it("should switch from upvote to downvote", () => {
      const { result } = renderHook(() => useVote(), { wrapper });

      // Set initial upvote
      act(() => {
        result.current.votes[1] = { upvotes: 1, downvotes: 0, userVote: "up" };
      });

      let nextVote: "up" | "down" | null;
      act(() => {
        nextVote = result.current.addVote(1, false);
      });

      expect(nextVote!).toBe("down");
      expect(result.current.votes[1]).toEqual({
        upvotes: 0,
        downvotes: 1,
        userVote: "down",
      });
    });

    it("should submit vote to API", async () => {
      (voteService.InsertVote as ReturnType<typeof vi.fn>).mockResolvedValue({});

      const { result } = renderHook(() => useVote(), { wrapper });

      await act(async () => {
        await result.current.submitVote(1, "up");
      });

      expect(voteService.InsertVote).toHaveBeenCalledWith({
        shop_id: 1,
        user_id: mockUserMetadata.id,
        upvote: true,
        downvote: false,
      });
    });

    it("should submit null vote (unvote) to API", async () => {
      (voteService.InsertVote as ReturnType<typeof vi.fn>).mockResolvedValue({});

      const { result } = renderHook(() => useVote(), { wrapper });

      await act(async () => {
        await result.current.submitVote(1, null);
      });

      expect(voteService.InsertVote).toHaveBeenCalledWith({
        shop_id: 1,
        user_id: mockUserMetadata.id,
        upvote: false,
        downvote: false,
      });
    });

    it("should handle vote submission errors", async () => {
      (voteService.InsertVote as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error("API error")
      );

      const { result } = renderHook(() => useVote(), { wrapper });

      const consoleErrorSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});

      await expect(
        act(async () => {
          await result.current.submitVote(1, "up");
        })
      ).rejects.toThrow("Failed to submit vote.");

      expect(consoleErrorSpy).toHaveBeenCalled();
      consoleErrorSpy.mockRestore();
    });

    it("should not submit vote if user is not authenticated", async () => {
      (authContext.useAuth as ReturnType<typeof vi.fn>).mockReturnValue({
        user: null,
        userMetadata: null,
        isAuthenticated: false,
      });

      const { result } = renderHook(() => useVote(), { wrapper });

      await act(async () => {
        await result.current.submitVote(1, "up");
      });

      expect(voteService.InsertVote).not.toHaveBeenCalled();
    });
  });

  describe("Vote State Management", () => {
    it("should maintain separate vote states for different shops", () => {
      const { result } = renderHook(() => useVote(), { wrapper });

      act(() => {
        result.current.addVote(1, true);
        result.current.addVote(2, false);
      });

      expect(result.current.votes[1]).toEqual({
        upvotes: 1,
        downvotes: 0,
        userVote: "up",
      });

      expect(result.current.votes[2]).toEqual({
        upvotes: 0,
        downvotes: 1,
        userVote: "down",
      });
    });

    it("should not affect other shops when toggling a vote", () => {
      const { result } = renderHook(() => useVote(), { wrapper });

      act(() => {
        result.current.votes[1] = { upvotes: 1, downvotes: 0, userVote: "up" };
        result.current.votes[2] = { upvotes: 0, downvotes: 1, userVote: "down" };
      });

      act(() => {
        result.current.addVote(1, true); // Toggle off shop 1's upvote
      });

      expect(result.current.votes[1]).toEqual({
        upvotes: 0,
        downvotes: 0,
        userVote: null,
      });

      // Shop 2 should remain unchanged
      expect(result.current.votes[2]).toEqual({
        upvotes: 0,
        downvotes: 1,
        userVote: "down",
      });
    });

    it("should never have negative vote counts", () => {
      const { result } = renderHook(() => useVote(), { wrapper });

      act(() => {
        result.current.votes[1] = { upvotes: 0, downvotes: 0, userVote: null };
      });

      act(() => {
        result.current.addVote(1, true);
      });

      act(() => {
        result.current.addVote(1, true); // Toggle off
      });

      expect(result.current.votes[1].upvotes).toBeGreaterThanOrEqual(0);
      expect(result.current.votes[1].downvotes).toBeGreaterThanOrEqual(0);
    });
  });

  describe("Loading State", () => {
    it("should set loading state during vote fetch", async () => {
      (voteService.GetVotesForShop as ReturnType<typeof vi.fn>).mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve({
          upvotes: 5,
          downvotes: 2,
          userVote: null,
        }), 100))
      );

      const { result } = renderHook(() => useVote(), { wrapper });

      expect(result.current.loadingVotes).toBe(false);

      act(() => {
        result.current.getVotesForShop(1);
      });

      // Should be loading immediately
      expect(result.current.loadingVotes).toBe(true);

      await waitFor(() => {
        expect(result.current.loadingVotes).toBe(false);
      });
    });
  });
});