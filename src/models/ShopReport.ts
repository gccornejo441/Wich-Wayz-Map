import {
  ModerationAction,
  ModeratorOutcome,
  ReportReason,
} from "@constants/moderationPolicy";

export type ShopReportStatus = "open" | "reviewed" | "resolved" | "dismissed";

export interface SubmitShopReportPayload {
  shopId: number;
  reason: ReportReason;
  details?: string;
}

export interface ShopReport {
  id: number;
  shopId: number;
  shopName?: string | null;
  reporterUserId: number;
  reporterEmail?: string | null;
  reason: ReportReason;
  details: string | null;
  moderatorOutcome: ModeratorOutcome;
  moderationActions: ModerationAction[];
  status: ShopReportStatus;
  dateCreated: string;
  dateModified: string;
}
