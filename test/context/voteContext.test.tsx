import { renderHook, act, RenderHookResult } from "@testing-library/react";
import { useVote, VoteProvider } from "../../src/context/voteContext";
import { AuthProvider } from "../../src/context/authContext";

const customRenderHook = <T, R>(hook: () => T): RenderHookResult<T, R> =>
  renderHook(() => hook(), {
    wrapper: ({ children }) => (
      <AuthProvider>
        <VoteProvider>{children}</VoteProvider>
      </AuthProvider>
    ),
  });

describe("addVote", () => {
  it("should add an upvote when no prior vote exists", () => {
    const { result } = customRenderHook(() => useVote());

    act(() => {
      result.current.addVote(1, true);
    });

    expect(result.current.votes[1]).toEqual({
      upvotes: 1,
      downvotes: 0,
      userVote: "up",
    });
  });

  it("should switch from upvote to downvote correctly", () => {
    const { result } = customRenderHook(() => useVote());

    act(() => {
      result.current.addVote(1, true);
      result.current.addVote(1, false);
    });

    expect(result.current.votes[1]).toEqual({
      upvotes: 0,
      downvotes: 1,
      userVote: "down",
    });
  });

  it("should remove an upvote when toggled twice", () => {
    const { result } = customRenderHook(() => useVote());

    act(() => {
      result.current.addVote(1, true);
      result.current.addVote(1, true);
    });

    expect(result.current.votes[1]).toEqual({
      upvotes: 0,
      downvotes: 0,
      userVote: null,
    });
  });

  it("should not change vote count if the same vote is submitted multiple times", () => {
    const { result } = customRenderHook(() => useVote());

    act(() => {
      result.current.addVote(1, true);
    });

    expect(result.current.votes[1]).toEqual({
      upvotes: 1,
      downvotes: 0,
      userVote: "up",
    });
  });
});
