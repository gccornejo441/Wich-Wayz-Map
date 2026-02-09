import {
  MODERATION_ACTION_ORDER,
  MODERATOR_OUTCOME_ORDER,
  ModerationAction,
  ModeratorOutcome,
  REPORT_REASON_ORDER,
  ReportReason,
} from "@constants/moderationPolicy";
import {
  ShopReport,
  ShopReportStatus,
  SubmitShopReportPayload,
} from "@models/ShopReport";
import { authApiRequest } from "@services/apiClient";

const VALID_REPORT_STATUSES: readonly ShopReportStatus[] = [
  "open",
  "reviewed",
  "resolved",
  "dismissed",
];

interface ShopReportApiResponse {
  id: number | string;
  shopId?: number | string;
  shop_id?: number | string;
  shopName?: string | null;
  shop_name?: string | null;
  reporterUserId?: number | string;
  reporter_user_id?: number | string;
  reporterEmail?: string | null;
  reporter_email?: string | null;
  reason: ReportReason;
  details?: string | null;
  moderatorOutcome?: ModeratorOutcome;
  moderator_outcome?: ModeratorOutcome;
  moderationActions?: ModerationAction[] | string;
  moderation_actions?: ModerationAction[] | string;
  status?: ShopReportStatus;
  report_status?: ShopReportStatus;
  dateCreated?: string;
  date_created?: string;
  dateModified?: string;
  date_modified?: string;
}

interface ModerationReportsResponse {
  items?: ShopReportApiResponse[];
}

export interface GetModerationReportsParams {
  status?: ShopReportStatus;
  outcome?: ModeratorOutcome;
  limit?: number;
}

export interface UpdateShopReportModerationPayload {
  status?: ShopReportStatus;
  moderatorOutcome?: ModeratorOutcome;
  moderationActions?: ModerationAction[];
}

const isReportReason = (value: unknown): value is ReportReason =>
  typeof value === "string" &&
  (REPORT_REASON_ORDER as readonly string[]).includes(value);

const isModeratorOutcome = (value: unknown): value is ModeratorOutcome =>
  typeof value === "string" &&
  (MODERATOR_OUTCOME_ORDER as readonly string[]).includes(value);

const isModerationAction = (value: unknown): value is ModerationAction =>
  typeof value === "string" &&
  (MODERATION_ACTION_ORDER as readonly string[]).includes(value);

const isReportStatus = (value: unknown): value is ShopReportStatus =>
  typeof value === "string" &&
  (VALID_REPORT_STATUSES as readonly string[]).includes(value);

const parseModerationActions = (
  raw:
    | ShopReportApiResponse["moderationActions"]
    | ShopReportApiResponse["moderation_actions"],
): ModerationAction[] => {
  if (Array.isArray(raw)) {
    return raw.filter((value): value is ModerationAction =>
      isModerationAction(value),
    );
  }

  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.filter((value): value is ModerationAction =>
          isModerationAction(value),
        );
      }
    } catch (error) {
      console.error("Failed to parse moderation actions:", error);
    }
  }

  return [];
};

const mapShopReport = (raw: ShopReportApiResponse): ShopReport => ({
  id: Number(raw.id),
  shopId: Number(raw.shopId ?? raw.shop_id),
  shopName: raw.shopName ?? raw.shop_name ?? null,
  reporterUserId: Number(raw.reporterUserId ?? raw.reporter_user_id),
  reporterEmail: raw.reporterEmail ?? raw.reporter_email ?? null,
  reason: raw.reason,
  details: raw.details ?? null,
  moderatorOutcome:
    raw.moderatorOutcome ?? raw.moderator_outcome ?? "needs_more_information",
  moderationActions: parseModerationActions(
    raw.moderationActions ?? raw.moderation_actions,
  ),
  status: raw.status ?? raw.report_status ?? "open",
  dateCreated: String(raw.dateCreated ?? raw.date_created ?? ""),
  dateModified: String(raw.dateModified ?? raw.date_modified ?? ""),
});

const buildReportsQuery = (params: GetModerationReportsParams): string => {
  const searchParams = new URLSearchParams();

  if (params.status) {
    searchParams.set("status", params.status);
  }
  if (params.outcome) {
    searchParams.set("outcome", params.outcome);
  }
  if (typeof params.limit === "number") {
    searchParams.set("limit", String(params.limit));
  }

  const query = searchParams.toString();
  return query ? `?${query}` : "";
};

export const submitShopReport = async (
  payload: SubmitShopReportPayload,
): Promise<ShopReport> => {
  const parsedShopId = Number(payload.shopId);
  const trimmedDetails = payload.details?.trim() ?? "";

  if (!Number.isInteger(parsedShopId) || parsedShopId <= 0) {
    throw new Error("Invalid shop id");
  }

  if (!isReportReason(payload.reason)) {
    throw new Error("Invalid report reason");
  }

  if (trimmedDetails.length > 1000) {
    throw new Error("Report details must be 1000 characters or fewer");
  }

  try {
    const response = await authApiRequest<ShopReportApiResponse>("/reports", {
      method: "POST",
      body: JSON.stringify({
        shopId: parsedShopId,
        reason: payload.reason,
        details: trimmedDetails || undefined,
      }),
    });

    return mapShopReport(response);
  } catch (error) {
    console.error("Failed to submit shop report:", error);
    throw new Error("Failed to submit report");
  }
};

export const getModerationReports = async (
  params: GetModerationReportsParams = {},
): Promise<ShopReport[]> => {
  if (params.status && !isReportStatus(params.status)) {
    throw new Error("Invalid report status filter");
  }
  if (params.outcome && !isModeratorOutcome(params.outcome)) {
    throw new Error("Invalid moderator outcome filter");
  }
  if (
    params.limit !== undefined &&
    (!Number.isInteger(params.limit) || params.limit <= 0)
  ) {
    throw new Error("Invalid report limit");
  }

  try {
    const query = buildReportsQuery(params);
    const response = await authApiRequest<ModerationReportsResponse>(
      `/reports${query}`,
    );
    const items = Array.isArray(response.items) ? response.items : [];
    return items.map((item) => mapShopReport(item));
  } catch (error) {
    console.error("Failed to load moderation reports:", error);
    throw new Error("Failed to load moderation reports");
  }
};

export const updateShopReportModeration = async (
  reportId: number,
  payload: UpdateShopReportModerationPayload,
): Promise<ShopReport> => {
  const parsedReportId = Number(reportId);
  if (!Number.isInteger(parsedReportId) || parsedReportId <= 0) {
    throw new Error("Invalid report id");
  }

  const hasStatus = payload.status !== undefined;
  const hasOutcome = payload.moderatorOutcome !== undefined;
  const hasActions = payload.moderationActions !== undefined;
  if (!hasStatus && !hasOutcome && !hasActions) {
    throw new Error("No moderation updates provided");
  }

  if (hasStatus && !isReportStatus(payload.status)) {
    throw new Error("Invalid report status");
  }
  if (hasOutcome && !isModeratorOutcome(payload.moderatorOutcome)) {
    throw new Error("Invalid moderator outcome");
  }
  if (
    hasActions &&
    (!Array.isArray(payload.moderationActions) ||
      payload.moderationActions.some((action) => !isModerationAction(action)))
  ) {
    throw new Error("Invalid moderation actions");
  }

  try {
    const response = await authApiRequest<ShopReportApiResponse>(
      `/reports/${parsedReportId}`,
      {
        method: "PATCH",
        body: JSON.stringify({
          status: payload.status,
          moderatorOutcome: payload.moderatorOutcome,
          moderationActions: payload.moderationActions,
        }),
      },
    );

    return mapShopReport(response);
  } catch (error) {
    console.error("Failed to update moderation report:", error);
    throw new Error("Failed to update moderation report");
  }
};
