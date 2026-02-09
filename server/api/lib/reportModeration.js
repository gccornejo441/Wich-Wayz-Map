export const REPORT_REASON_ACTION_MAP = {
  spam: ["hide_shop", "unlist_shop"],
  wrong_location: ["update_location_data"],
  closed: ["update_location_status"],
  duplicate: ["mark_canonical", "hide_duplicate"],
};

export const VALID_REPORT_REASONS = Object.keys(REPORT_REASON_ACTION_MAP);

export const VALID_MODERATOR_OUTCOMES = [
  "action_taken",
  "no_action_needed",
  "needs_more_information",
];

export const VALID_REPORT_STATUSES = [
  "open",
  "reviewed",
  "resolved",
  "dismissed",
];

export const VALID_MODERATION_ACTIONS = [
  "hide_shop",
  "unlist_shop",
  "update_location_data",
  "update_location_status",
  "mark_canonical",
  "hide_duplicate",
];

export const parseModerationActions = (raw) => {
  if (Array.isArray(raw)) {
    return raw.filter((value) => typeof value === "string");
  }

  if (typeof raw === "string" && raw.trim()) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.filter((value) => typeof value === "string");
      }
    } catch (error) {
      console.error("Failed to parse moderation actions:", error);
    }
  }

  return [];
};

export const mapReportRow = (row) => ({
  id: Number(row.id),
  shopId: Number(row.shop_id),
  shopName: row.shop_name ?? null,
  reporterUserId: Number(row.reporter_user_id),
  reporterEmail: row.reporter_email ?? null,
  reason: String(row.reason),
  details: row.details ?? null,
  moderatorOutcome: String(row.moderator_outcome),
  moderationActions: parseModerationActions(row.moderation_actions),
  status: String(row.report_status),
  dateCreated: String(row.date_created),
  dateModified: String(row.date_modified ?? row.date_created),
});

export const parsePositiveInt = (value) => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
};

export const isMissingReportsTableError = (error) => {
  const message = error?.message || "";
  return (
    message.includes("no such table: shop_reports") ||
    message.includes("table shop_reports")
  );
};

export const sanitizeReason = (value) =>
  typeof value === "string" ? value.trim().toLowerCase() : "";

export const sanitizeModerationActions = (value) => {
  if (!Array.isArray(value)) return null;

  const normalized = value
    .filter((item) => typeof item === "string")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);

  const unique = [...new Set(normalized)];
  const invalid = unique.find(
    (item) => !VALID_MODERATION_ACTIONS.includes(item),
  );

  if (invalid) {
    return null;
  }

  return unique;
};
