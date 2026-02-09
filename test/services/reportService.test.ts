import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  getModerationReports,
  submitShopReport,
  updateShopReportModeration,
} from "@services/reportService";

vi.mock("@services/firebase", () => ({
  auth: {
    currentUser: {
      getIdToken: vi.fn().mockResolvedValue("mock-token"),
    },
  },
}));

const mockFetch = (data: unknown, status = 200) => {
  global.fetch = vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: async () => data,
    headers: new Headers(),
  } as Response);
};

describe("reportService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("submits a shop report payload", async () => {
    mockFetch({
      id: 12,
      shop_id: 99,
      reporter_user_id: 5,
      reason: "closed",
      details: "Closed last month",
      moderator_outcome: "needs_more_information",
      moderation_actions: ["update_location_status"],
      report_status: "open",
      date_created: "2026-02-09T12:00:00Z",
      date_modified: "2026-02-09T12:00:00Z",
    });

    const result = await submitShopReport({
      shopId: 99,
      reason: "closed",
      details: "Closed last month",
    });

    expect(result.shopId).toBe(99);
    expect(result.reason).toBe("closed");
    expect(result.moderationActions).toEqual(["update_location_status"]);

    const call = (global.fetch as unknown as ReturnType<typeof vi.fn>).mock
      .calls[0];
    const body = JSON.parse(call[1].body as string);
    expect(call[0]).toContain("/api/reports");
    expect(call[1].method).toBe("POST");
    expect(body).toMatchObject({
      shopId: 99,
      reason: "closed",
      details: "Closed last month",
    });
  });

  it("rejects unknown report reasons before API call", async () => {
    await expect(
      submitShopReport({
        shopId: 1,
        reason: "not_a_reason" as never,
      }),
    ).rejects.toThrow("Invalid report reason");

    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("loads moderation reports with optional filters", async () => {
    mockFetch({
      items: [
        {
          id: 20,
          shop_id: 3,
          shop_name: "Test Shop",
          reporter_user_id: 8,
          reporter_email: "fan@example.com",
          reason: "spam",
          details: null,
          moderator_outcome: "needs_more_information",
          moderation_actions: ["hide_shop", "unlist_shop"],
          report_status: "open",
          date_created: "2026-02-09T12:00:00Z",
          date_modified: "2026-02-09T12:00:00Z",
        },
      ],
    });

    const reports = await getModerationReports({
      status: "open",
      outcome: "needs_more_information",
      limit: 25,
    });

    expect(reports).toHaveLength(1);
    expect(reports[0].shopName).toBe("Test Shop");
    expect(reports[0].reporterEmail).toBe("fan@example.com");

    const call = (global.fetch as unknown as ReturnType<typeof vi.fn>).mock
      .calls[0];
    expect(call[0]).toContain(
      "/api/reports?status=open&outcome=needs_more_information&limit=25",
    );
  });

  it("updates report moderation fields", async () => {
    mockFetch({
      id: 55,
      shop_id: 4,
      reporter_user_id: 2,
      reason: "closed",
      details: "Closed permanently",
      moderator_outcome: "action_taken",
      moderation_actions: ["update_location_status"],
      report_status: "resolved",
      date_created: "2026-02-09T12:00:00Z",
      date_modified: "2026-02-09T13:00:00Z",
    });

    const updated = await updateShopReportModeration(55, {
      status: "resolved",
      moderatorOutcome: "action_taken",
      moderationActions: ["update_location_status"],
    });

    expect(updated.status).toBe("resolved");
    expect(updated.moderatorOutcome).toBe("action_taken");

    const call = (global.fetch as unknown as ReturnType<typeof vi.fn>).mock
      .calls[0];
    expect(call[0]).toContain("/api/reports/55");
    expect(call[1].method).toBe("PATCH");
  });
});
