import { describe, expect, it } from "vitest";
import { createClient } from "@libsql/client";
import {
  applyCollisionSuffix,
  generateRedditStyleUsername,
  sanitizeUsername,
  validateUsername,
} from "../../server/api/lib/username.js";

const USERNAME_REGEX = /^[A-Za-z0-9_-]{3,20}$/;

const createTempDbClient = () => createClient({ url: "file::memory:" });

describe("username validation", () => {
  it("accepts valid usernames", () => {
    const validUsernames = ["abc", "john_doe", "john-doe", "a1_b2-c3"];

    for (const username of validUsernames) {
      expect(validateUsername(username).ok).toBe(true);
    }
  });

  it("rejects invalid usernames", () => {
    const invalidUsernames = [
      "ab",
      "abcdefghijklmnopqrstu",
      "john.doe",
      "john doe",
      "john$doe",
      "😊",
    ];

    for (const username of invalidUsernames) {
      expect(validateUsername(username).ok).toBe(false);
    }
  });
});

describe("reddit-style generation", () => {
  it("always generates usernames that match format rules", () => {
    for (let index = 0; index < 200; index += 1) {
      const username = generateRedditStyleUsername(`seed-${index}`);
      expect(username).toMatch(USERNAME_REGEX);
      expect(username.includes(".")).toBe(false);
      expect(/\s/.test(username)).toBe(false);
    }
  });

  it("does not leak email local-part when seeded with an email string", () => {
    const username = generateRedditStyleUsername("john.doe@example.com");
    expect(username.includes("john")).toBe(false);
    expect(username.includes("doe")).toBe(false);
  });

  it("applies collision suffix within max length", () => {
    const nearMaxBase = "abcdefghijklmnopqrst";
    const candidate = applyCollisionSuffix(nearMaxBase, 4821);

    expect(candidate.length).toBeLessThanOrEqual(20);
    expect(candidate).toMatch(/[-_][0-9]{4}$/);
  });
});

describe("case-insensitive uniqueness expectations", () => {
  it("normalizes username casing server-side", () => {
    expect(sanitizeUsername("John_Doe")).toBe("john_doe");
    expect(sanitizeUsername("john_doe")).toBe("john_doe");
  });

  it("conflicts at the DB layer for case-only username differences", async () => {
    const client = createTempDbClient();

    try {
      await client.execute({
        sql: "CREATE TABLE users (id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT NOT NULL)",
        args: [],
      });
      await client.execute({
        sql: "CREATE UNIQUE INDEX ux_users_username_lower ON users(LOWER(username))",
        args: [],
      });
      await client.execute({
        sql: "INSERT INTO users (username) VALUES (?)",
        args: ["John_Doe"],
      });

      await expect(
        client.execute({
          sql: "INSERT INTO users (username) VALUES (?)",
          args: ["john_doe"],
        }),
      ).rejects.toThrow(/UNIQUE/i);
    } finally {
      if (typeof client.close === "function") {
        await client.close();
      }
    }
  });
});
