import { describe, it, expect, beforeEach, vi } from "vitest";
import { updateUserProfile } from "../../../src/services/apiClient";

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock Firebase auth
vi.mock("../../../src/services/firebase", () => ({
  auth: {
    currentUser: {
      getIdToken: vi.fn().mockResolvedValue("mock-token"),
    },
  },
}));

describe("User Profile Update API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should accept and update first_name field", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        id: 1,
        first_name: "John",
        last_name: "Doe",
        username: "johndoe",
        avatar: "avatar1",
      }),
    });

    await updateUserProfile(1, { first_name: "John" });

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url, options] = mockFetch.mock.calls[0];
    expect(url).toBe("/api/users/1");
    expect(options.method).toBe("PATCH");
    expect(options.body).toBe(JSON.stringify({ first_name: "John" }));
  });

  it("should accept and update last_name field", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        id: 1,
        first_name: "John",
        last_name: "Smith",
        username: "johndoe",
        avatar: "avatar1",
      }),
    });

    await updateUserProfile(1, { last_name: "Smith" });

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/users/1"),
      expect.objectContaining({
        method: "PATCH",
        body: JSON.stringify({ last_name: "Smith" }),
      }),
    );
  });

  it("should accept and update username field", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        id: 1,
        first_name: "John",
        last_name: "Doe",
        username: "newusername",
        avatar: "avatar1",
      }),
    });

    await updateUserProfile(1, { username: "newusername" });

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/users/1"),
      expect.objectContaining({
        method: "PATCH",
        body: JSON.stringify({ username: "newusername" }),
      }),
    );
  });

  it("should accept and update avatar field", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        id: 1,
        first_name: "John",
        last_name: "Doe",
        username: "johndoe",
        avatar: "avatar2",
      }),
    });

    await updateUserProfile(1, { avatar: "avatar2" });

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/users/1"),
      expect.objectContaining({
        method: "PATCH",
        body: JSON.stringify({ avatar: "avatar2" }),
      }),
    );
  });

  it("should accept multiple profile fields in one update", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        id: 1,
        first_name: "Jane",
        last_name: "Smith",
        username: "janesmith",
        avatar: "avatar3",
      }),
    });

    await updateUserProfile(1, {
      first_name: "Jane",
      last_name: "Smith",
      avatar: "avatar3",
    });

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/users/1"),
      expect.objectContaining({
        method: "PATCH",
        body: JSON.stringify({
          first_name: "Jane",
          last_name: "Smith",
          avatar: "avatar3",
        }),
      }),
    );
  });

  it("should accept null values for profile fields", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        id: 1,
        first_name: null,
        last_name: null,
        username: "johndoe",
        avatar: null,
      }),
    });

    await updateUserProfile(1, {
      first_name: null,
      last_name: null,
      avatar: null,
    });

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/users/1"),
      expect.objectContaining({
        method: "PATCH",
        body: JSON.stringify({
          first_name: null,
          last_name: null,
          avatar: null,
        }),
      }),
    );
  });

  it("should throw error when API returns 400 with proper message", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: async () => ({ message: "No updates provided" }),
    });

    await expect(updateUserProfile(1, {})).rejects.toThrow(
      "No updates provided",
    );
  });

  it("should handle 404 user not found error", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
      json: async () => ({ message: "User not found" }),
    });

    await expect(
      updateUserProfile(999, { first_name: "Test" }),
    ).rejects.toThrow("User not found");
  });

  it("should handle 500 server error", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({ message: "Failed to update user" }),
    });

    await expect(updateUserProfile(1, { first_name: "Test" })).rejects.toThrow(
      "Failed to update user",
    );
  });

  it("should properly handle updates with role field (admin operations)", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        id: 1,
        first_name: "John",
        last_name: "Doe",
        username: "johndoe",
        avatar: "avatar1",
        role: "admin",
      }),
    });

    await updateUserProfile(1, { role: "admin" });

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/users/1"),
      expect.objectContaining({
        method: "PATCH",
        body: JSON.stringify({ role: "admin" }),
      }),
    );
  });

  it("should handle combined profile and admin field updates", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        id: 1,
        first_name: "Admin",
        last_name: "User",
        username: "adminuser",
        avatar: "avatar1",
        role: "admin",
        membership_status: "active",
      }),
    });

    await updateUserProfile(1, {
      first_name: "Admin",
      last_name: "User",
      role: "admin",
      membershipStatus: "active",
    });

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/users/1"),
      expect.objectContaining({
        method: "PATCH",
        body: JSON.stringify({
          first_name: "Admin",
          last_name: "User",
          role: "admin",
          membershipStatus: "active",
        }),
      }),
    );
  });
});
