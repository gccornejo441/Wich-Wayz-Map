import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import AvatarOptions, {
  avatarOptions,
} from "../../src/components/Avatar/AvatarOptions";

describe("AvatarOptions Component", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.resetAllMocks();
    vi.useRealTimers();
  });

  // This test checks that the avatars are rendered after the loading state.
  it("renders avatars after loading state", async () => {
    const onClose = vi.fn();
    const onSelect = vi.fn();

    await act(async () => {
      render(
        <AvatarOptions
          isOpen={true}
          onClose={onClose}
          onSelect={onSelect}
          selectedAvatarId={undefined}
        />,
      );
    });

    expect(screen.getByText("Select an Avatar")).toBeInTheDocument();

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    const gravatar = screen.getByAltText("Avatar Gravatar");
    expect(gravatar).toBeInTheDocument();

    const firstAvatar = screen.getByAltText(`Avatar ${avatarOptions[0].id}`);
    await act(async () => {
      fireEvent.click(firstAvatar);
    });
    expect(onSelect).toHaveBeenCalledWith(avatarOptions[0].id);

    await act(async () => {
      fireEvent.click(screen.getByText("Cancel"));
    });
    expect(onClose).toHaveBeenCalled();
  });
});
