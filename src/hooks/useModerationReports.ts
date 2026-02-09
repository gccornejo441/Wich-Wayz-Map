import { useCallback, useEffect, useState } from "react";
import { ModeratorOutcome } from "@constants/moderationPolicy";
import { useToast } from "@context/toastContext";
import { ShopReport, ShopReportStatus } from "@models/ShopReport";
import {
  getModerationReports,
  UpdateShopReportModerationPayload,
  updateShopReportModeration,
} from "@services/reportService";

type StatusFilter = ShopReportStatus | "all";
type OutcomeFilter = ModeratorOutcome | "all";

export const useModerationReports = () => {
  const { addToast } = useToast();

  const [reports, setReports] = useState<ShopReport[]>([]);
  const [isLoadingReports, setIsLoadingReports] = useState(true);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("open");
  const [outcomeFilter, setOutcomeFilter] = useState<OutcomeFilter>("all");
  const [updatingReportId, setUpdatingReportId] = useState<number | null>(null);

  const refreshReports = useCallback(async () => {
    try {
      setIsLoadingReports(true);
      const items = await getModerationReports({
        status: statusFilter === "all" ? undefined : statusFilter,
        outcome: outcomeFilter === "all" ? undefined : outcomeFilter,
      });
      setReports(items);
    } catch (error) {
      console.error("Failed to fetch moderation reports:", error);
      addToast("Failed to load moderation reports.", "error");
    } finally {
      setIsLoadingReports(false);
    }
  }, [addToast, outcomeFilter, statusFilter]);

  useEffect(() => {
    refreshReports().catch((error) =>
      console.error("Failed to refresh moderation reports:", error),
    );
  }, [refreshReports]);

  const updateReport = async (
    reportId: number,
    payload: UpdateShopReportModerationPayload,
  ) => {
    try {
      setUpdatingReportId(reportId);
      const updated = await updateShopReportModeration(reportId, payload);

      const matchesStatus =
        statusFilter === "all" || updated.status === statusFilter;
      const matchesOutcome =
        outcomeFilter === "all" || updated.moderatorOutcome === outcomeFilter;

      setReports((prev) => {
        if (!matchesStatus || !matchesOutcome) {
          return prev.filter((report) => report.id !== reportId);
        }
        return prev.map((report) =>
          report.id === reportId ? updated : report,
        );
      });

      addToast("Report moderation updated.", "success");
      return updated;
    } catch (error) {
      console.error("Failed to update report moderation:", error);
      addToast("Failed to update report moderation.", "error");
      return null;
    } finally {
      setUpdatingReportId(null);
    }
  };

  return {
    reports,
    isLoadingReports,
    statusFilter,
    outcomeFilter,
    updatingReportId,
    setStatusFilter,
    setOutcomeFilter,
    refreshReports,
    updateReport,
  };
};
