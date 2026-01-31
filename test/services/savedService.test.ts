import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import { getSavedShopIds, toggleSavedShop } from "../../src/services/savedService";

const mockFetch = (data: unknown, status = 200) => {
  global.fetch = vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: async () => data,
    headers: new Headers(),
  } as Response);
};

describe("savedService", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("maps saved items with snake_case fields", async () => {
    mockFetch({
      items: [{ shop_id: 5, date_created: "2026-01-30T10:00:00Z" }],
    });

    const items = await getSavedShopIds();
    expect(items).toHaveLength(1);
    expect(items[0].shopId).toBe(5);
    expect(items[0].dateCreated).toBe("2026-01-30T10:00:00Z");
  });

  it("sends user id when toggling saved shop", async () => {
    mockFetch({ saved: true });

    const saved = await toggleSavedShop(7, 42);
    expect(saved).toBe(true);

    const call = (global.fetch as unknown as ReturnType<typeof vi.fn>).mock
      .calls[0];
    const body = JSON.parse(call[1].body as string);
    expect(body).toMatchObject({ shopId: 7, userId: 42, user_id: 42 });
    expect(call[0]).toContain("/api/saved/toggle");
  });
});
