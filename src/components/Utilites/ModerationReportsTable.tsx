import { useEffect, useMemo, useState } from "react";
import {
  MODERATION_ACTION_ORDER,
  MODERATION_ACTIONS,
  MODERATOR_OUTCOME_ORDER,
  MODERATOR_OUTCOMES,
  ModerationAction,
  REPORT_REASON_ACTION_MAP,
  REPORT_REASON_DEFINITIONS,
} from "@constants/moderationPolicy";
import { ShopReport, ShopReportStatus } from "@models/ShopReport";
import { UpdateShopReportModerationPayload } from "@services/reportService";

type StatusFilter = ShopReportStatus | "all";
type OutcomeFilter = ShopReport["moderatorOutcome"] | "all";

interface ModerationReportsTableProps {
  reports: ShopReport[];
  isLoading: boolean;
  statusFilter: StatusFilter;
  outcomeFilter: OutcomeFilter;
  updatingReportId: number | null;
  setStatusFilter: (value: StatusFilter) => void;
  setOutcomeFilter: (value: OutcomeFilter) => void;
  onRefresh: () => Promise<void>;
  onUpdateReport: (
    reportId: number,
    payload: UpdateShopReportModerationPayload,
  ) => Promise<ShopReport | null>;
}

interface ReportDraft {
  status: ShopReportStatus;
  moderatorOutcome: ShopReport["moderatorOutcome"];
  moderationActions: ModerationAction[];
}

const STATUS_OPTIONS: ShopReportStatus[] = [
  "open",
  "reviewed",
  "resolved",
  "dismissed",
];

const normalizeActionList = (actions: ModerationAction[]): ModerationAction[] =>
  [...new Set(actions)].sort((a, b) => a.localeCompare(b));

const formatTimestamp = (value: string): string => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
};

const ModerationReportsTable = ({
  reports,
  isLoading,
  statusFilter,
  outcomeFilter,
  updatingReportId,
  setStatusFilter,
  setOutcomeFilter,
  onRefresh,
  onUpdateReport,
}: ModerationReportsTableProps) => {
  const [drafts, setDrafts] = useState<Record<number, ReportDraft>>({});

  useEffect(() => {
    const nextDrafts: Record<number, ReportDraft> = {};
    reports.forEach((report) => {
      nextDrafts[report.id] = {
        status: report.status,
        moderatorOutcome: report.moderatorOutcome,
        moderationActions: normalizeActionList(report.moderationActions),
      };
    });
    setDrafts(nextDrafts);
  }, [reports]);

  const reportCountLabel = useMemo(() => {
    if (isLoading) return "Loading reports...";
    if (reports.length === 0) return "No reports found";
    return `${reports.length} report${reports.length === 1 ? "" : "s"}`;
  }, [isLoading, reports.length]);

  const setDraft = (reportId: number, next: Partial<ReportDraft>) => {
    setDrafts((prev) => {
      const current = prev[reportId];
      if (!current) return prev;
      return {
        ...prev,
        [reportId]: {
          ...current,
          ...next,
        },
      };
    });
  };

  const toggleAction = (reportId: number, action: ModerationAction) => {
    setDrafts((prev) => {
      const current = prev[reportId];
      if (!current) return prev;
      const hasAction = current.moderationActions.includes(action);
      const moderationActions = hasAction
        ? current.moderationActions.filter((item) => item !== action)
        : [...current.moderationActions, action];
      return {
        ...prev,
        [reportId]: {
          ...current,
          moderationActions: normalizeActionList(moderationActions),
        },
      };
    });
  };

  const applyMappedActions = (report: ShopReport) => {
    const mappedActions = normalizeActionList([
      ...REPORT_REASON_ACTION_MAP[report.reason],
    ]);

    setDraft(report.id, { moderationActions: mappedActions });
  };

  const arraysEqual = (a: ModerationAction[], b: ModerationAction[]) => {
    const left = normalizeActionList(a);
    const right = normalizeActionList(b);
    return (
      left.length === right.length &&
      left.every((value, index) => value === right[index])
    );
  };

  const hasChanges = (report: ShopReport, draft: ReportDraft): boolean =>
    report.status !== draft.status ||
    report.moderatorOutcome !== draft.moderatorOutcome ||
    !arraysEqual(report.moderationActions, draft.moderationActions);

  const handleSave = async (report: ShopReport) => {
    const draft = drafts[report.id];
    if (!draft) return;

    const updated = await onUpdateReport(report.id, {
      status: draft.status,
      moderatorOutcome: draft.moderatorOutcome,
      moderationActions: draft.moderationActions,
    });

    if (!updated) return;

    setDrafts((prev) => ({
      ...prev,
      [report.id]: {
        status: updated.status,
        moderatorOutcome: updated.moderatorOutcome,
        moderationActions: normalizeActionList(updated.moderationActions),
      },
    }));
  };

  return (
    <section className="p-4">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div>
          <h3 className="text-xl font-semibold text-text-base dark:text-text-inverted">
            Moderation Queue
          </h3>
          <p className="text-sm text-text-muted dark:text-text-inverted/70">
            {reportCountLabel}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={statusFilter}
            onChange={(event) =>
              setStatusFilter(event.target.value as StatusFilter)
            }
            className="rounded-lg border border-surface-dark/20 dark:border-surface-muted/20 bg-white dark:bg-surface-darker px-2 py-1.5 text-sm text-text-base dark:text-text-inverted"
          >
            <option value="all">All statuses</option>
            {STATUS_OPTIONS.map((status) => (
              <option key={status} value={status}>
                {status.replace("_", " ")}
              </option>
            ))}
          </select>

          <select
            value={outcomeFilter}
            onChange={(event) =>
              setOutcomeFilter(event.target.value as OutcomeFilter)
            }
            className="rounded-lg border border-surface-dark/20 dark:border-surface-muted/20 bg-white dark:bg-surface-darker px-2 py-1.5 text-sm text-text-base dark:text-text-inverted"
          >
            <option value="all">All outcomes</option>
            {MODERATOR_OUTCOME_ORDER.map((outcome) => (
              <option key={outcome} value={outcome}>
                {MODERATOR_OUTCOMES[outcome].label}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={() => {
              onRefresh().catch((error) =>
                console.error("Failed to refresh reports:", error),
              );
            }}
            className="rounded-lg bg-brand-primary px-3 py-1.5 text-sm font-semibold text-white hover:bg-brand-secondary hover:text-text-base transition-colors"
          >
            Refresh
          </button>
        </div>
      </div>

      {isLoading ? (
        <p className="text-sm text-text-muted dark:text-text-inverted/70 py-2">
          Loading moderation reports...
        </p>
      ) : reports.length === 0 ? (
        <p className="text-sm text-text-muted dark:text-text-inverted/70 py-2">
          No reports match current filters.
        </p>
      ) : (
        <div className="space-y-4">
          {reports.map((report) => {
            const draft = drafts[report.id];
            if (!draft) return null;

            const reasonDefinition = REPORT_REASON_DEFINITIONS[report.reason];
            const mappedActions = REPORT_REASON_ACTION_MAP[report.reason];
            const isUpdating = updatingReportId === report.id;
            const changed = hasChanges(report, draft);

            return (
              <article
                key={report.id}
                className="rounded-lg border border-surface-dark/10 dark:border-surface-muted/20 bg-surface-light dark:bg-surface-darker p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-text-base dark:text-text-inverted">
                      {report.shopName || `Shop #${report.shopId}`}
                    </p>
                    <p className="text-xs text-text-muted dark:text-text-inverted/70">
                      Report #{report.id} by{" "}
                      {report.reporterEmail || `User #${report.reporterUserId}`}
                    </p>
                  </div>
                  <p className="text-xs text-text-muted dark:text-text-inverted/70">
                    {formatTimestamp(report.dateCreated)}
                  </p>
                </div>

                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  <div>
                    <p className="text-xs font-semibold text-text-base dark:text-text-inverted">
                      Reason
                    </p>
                    <p className="text-sm text-text-base dark:text-text-inverted">
                      {reasonDefinition.label}
                    </p>
                    <p className="text-xs text-text-muted dark:text-text-inverted/70 mt-0.5">
                      {reasonDefinition.description}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-semibold text-text-base dark:text-text-inverted">
                      Details
                    </p>
                    <p className="text-sm text-text-base dark:text-text-inverted whitespace-pre-wrap">
                      {report.details || "No additional details provided."}
                    </p>
                  </div>
                </div>

                <div className="mt-4 grid gap-3 md:grid-cols-3">
                  <label className="flex flex-col gap-1">
                    <span className="text-xs font-semibold text-text-base dark:text-text-inverted">
                      Status
                    </span>
                    <select
                      value={draft.status}
                      onChange={(event) =>
                        setDraft(report.id, {
                          status: event.target.value as ShopReportStatus,
                        })
                      }
                      className="rounded-lg border border-surface-dark/20 dark:border-surface-muted/20 bg-white dark:bg-surface-dark px-2 py-1.5 text-sm text-text-base dark:text-text-inverted"
                    >
                      {STATUS_OPTIONS.map((status) => (
                        <option key={status} value={status}>
                          {status.replace("_", " ")}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="flex flex-col gap-1">
                    <span className="text-xs font-semibold text-text-base dark:text-text-inverted">
                      Outcome
                    </span>
                    <select
                      value={draft.moderatorOutcome}
                      onChange={(event) =>
                        setDraft(report.id, {
                          moderatorOutcome: event.target
                            .value as ShopReport["moderatorOutcome"],
                        })
                      }
                      className="rounded-lg border border-surface-dark/20 dark:border-surface-muted/20 bg-white dark:bg-surface-dark px-2 py-1.5 text-sm text-text-base dark:text-text-inverted"
                    >
                      {MODERATOR_OUTCOME_ORDER.map((outcome) => (
                        <option key={outcome} value={outcome}>
                          {MODERATOR_OUTCOMES[outcome].label}
                        </option>
                      ))}
                    </select>
                  </label>

                  <div className="flex items-end">
                    <button
                      type="button"
                      onClick={() => applyMappedActions(report)}
                      className="rounded-lg border border-surface-dark/20 dark:border-surface-muted/20 px-3 py-1.5 text-sm text-text-base dark:text-text-inverted hover:bg-surface-muted dark:hover:bg-surface-dark transition-colors"
                    >
                      Use Reason Mapping
                    </button>
                  </div>
                </div>

                <div className="mt-4">
                  <p className="text-xs font-semibold text-text-base dark:text-text-inverted mb-1">
                    Moderation actions
                  </p>
                  <div className="grid gap-1 md:grid-cols-2">
                    {MODERATION_ACTION_ORDER.map((action) => {
                      const checked = draft.moderationActions.includes(action);
                      const isMappedAction = mappedActions.includes(action);
                      return (
                        <label
                          key={action}
                          className="flex items-start gap-2 text-sm text-text-base dark:text-text-inverted"
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleAction(report.id, action)}
                            className="mt-0.5"
                          />
                          <span>
                            {MODERATION_ACTIONS[action].label}
                            {isMappedAction && (
                              <span className="ml-1 text-xs text-brand-primary">
                                (mapped)
                              </span>
                            )}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setDraft(report.id, {
                        status: report.status,
                        moderatorOutcome: report.moderatorOutcome,
                        moderationActions: normalizeActionList(
                          report.moderationActions,
                        ),
                      })
                    }
                    className="rounded-lg bg-surface-muted dark:bg-surface-dark px-3 py-1.5 text-sm text-text-base dark:text-text-inverted hover:bg-surface-dark dark:hover:bg-surface-muted transition-colors"
                  >
                    Reset
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      handleSave(report).catch((error) =>
                        console.error(
                          "Failed to save moderation report:",
                          error,
                        ),
                      );
                    }}
                    disabled={!changed || isUpdating}
                    className="rounded-lg bg-brand-primary px-3 py-1.5 text-sm font-semibold text-white hover:bg-brand-secondary hover:text-text-base transition-colors disabled:opacity-60"
                  >
                    {isUpdating ? "Saving..." : "Save Moderation"}
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
};

export default ModerationReportsTable;
