import { MouseEvent, useEffect } from "react";
import { Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import { FiFlag, FiX } from "react-icons/fi";
import {
  MODERATION_ACTIONS,
  MODERATOR_OUTCOMES,
  REPORT_REASON_ACTION_MAP,
  REPORT_REASON_DEFINITIONS,
  REPORT_REASON_ORDER,
  ReportReason,
} from "@constants/moderationPolicy";
import { ROUTES } from "@constants/routes";
import { shopReportSchema } from "@constants/validators";
import { useToast } from "@context/toastContext";
import { submitShopReport } from "@services/reportService";

interface ReportShopModalProps {
  isOpen: boolean;
  onClose: () => void;
  shopId?: number;
  shopName?: string;
}

interface ReportShopFormData {
  reason: ReportReason;
  details?: string;
}

const DEFAULT_REASON = REPORT_REASON_ORDER[0];

const ReportShopModal = ({
  isOpen,
  onClose,
  shopId,
  shopName,
}: ReportShopModalProps) => {
  const { addToast } = useToast();

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ReportShopFormData>({
    resolver: yupResolver(shopReportSchema),
    defaultValues: {
      reason: DEFAULT_REASON,
      details: "",
    },
  });

  const selectedReason = watch("reason");
  const mappedActions = REPORT_REASON_ACTION_MAP[selectedReason];
  const defaultOutcome =
    MODERATOR_OUTCOMES[
      REPORT_REASON_DEFINITIONS[selectedReason].moderatorOutcome
    ];

  useEffect(() => {
    if (!isOpen) {
      reset({ reason: DEFAULT_REASON, details: "" });
      return;
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen, onClose, reset]);

  if (!isOpen) return null;

  const handleOverlayClick = (event: MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) {
      onClose();
    }
  };

  const onSubmit = async (data: ReportShopFormData) => {
    if (!shopId || !Number.isInteger(shopId)) {
      addToast("No shop selected for reporting.", "error");
      return;
    }

    try {
      await submitShopReport({
        shopId,
        reason: data.reason,
        details: data.details,
      });
      addToast(
        "Report submitted. Thank you for helping improve the map.",
        "success",
      );
      onClose();
      reset({ reason: DEFAULT_REASON, details: "" });
    } catch (error) {
      console.error("Failed to submit report:", error);
      addToast("Could not submit report. Please try again.", "error");
    }
  };

  return (
    <div
      role="button"
      tabIndex={-1}
      className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
      onClick={handleOverlayClick}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          onClose();
        }
      }}
    >
      <div className="w-full max-w-lg bg-surface-light dark:bg-surface-darker rounded-xl shadow-2xl border border-surface-dark/10 dark:border-surface-muted/20 p-5">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <h3 className="text-lg font-semibold text-text-base dark:text-text-inverted flex items-center gap-2">
              <FiFlag className="text-brand-primary" />
              Report Shop
            </h3>
            <p className="text-sm text-text-muted dark:text-text-inverted/80 mt-1">
              {shopName ? `Reporting: ${shopName}` : "Submit a listing report"}
            </p>
          </div>
          <button
            type="button"
            aria-label="Close report modal"
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-surface-muted dark:hover:bg-surface-dark text-text-muted dark:text-text-inverted"
          >
            <FiX size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label
              htmlFor="report-reason"
              className="block text-sm font-medium text-text-base dark:text-text-inverted mb-1"
            >
              Report reason
            </label>
            <select
              id="report-reason"
              {...register("reason")}
              className="w-full rounded-lg border border-surface-dark/20 dark:border-surface-muted/20 bg-white dark:bg-surface-dark px-3 py-2 text-sm text-text-base dark:text-text-inverted focus:outline-none focus:ring-2 focus:ring-brand-secondary"
            >
              {REPORT_REASON_ORDER.map((reason) => (
                <option key={reason} value={reason}>
                  {REPORT_REASON_DEFINITIONS[reason].label}
                </option>
              ))}
            </select>
            {selectedReason && (
              <p className="mt-1 text-xs text-text-muted dark:text-text-inverted/80">
                {REPORT_REASON_DEFINITIONS[selectedReason].description}
              </p>
            )}
            {errors.reason && (
              <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                {errors.reason.message}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="report-details"
              className="block text-sm font-medium text-text-base dark:text-text-inverted mb-1"
            >
              Details (optional)
            </label>
            <textarea
              id="report-details"
              rows={4}
              maxLength={1000}
              placeholder="Share details that help moderators verify this report."
              {...register("details")}
              className="w-full rounded-lg border border-surface-dark/20 dark:border-surface-muted/20 bg-white dark:bg-surface-dark px-3 py-2 text-sm text-text-base dark:text-text-inverted focus:outline-none focus:ring-2 focus:ring-brand-secondary"
            />
            {errors.details && (
              <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                {errors.details.message}
              </p>
            )}
          </div>

          {selectedReason && (
            <div className="rounded-lg border border-surface-dark/10 dark:border-surface-muted/20 bg-surface-muted/60 dark:bg-surface-dark p-3">
              <p className="text-xs font-semibold text-text-base dark:text-text-inverted">
                Default moderator outcome: {defaultOutcome?.label}
              </p>
              <p className="mt-1 text-xs text-text-muted dark:text-text-inverted/80">
                {defaultOutcome?.description}
              </p>
              <p className="mt-2 text-xs text-text-base dark:text-text-inverted font-semibold">
                Mapped actions
              </p>
              <ul className="mt-1 text-xs text-text-muted dark:text-text-inverted/80 list-disc list-inside">
                {mappedActions.map((action) => (
                  <li key={action}>{MODERATION_ACTIONS[action].label}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex items-center justify-between gap-3 pt-1">
            <Link
              to={ROUTES.LEGAL.COMMUNITY_GUIDELINES}
              className="text-xs text-primary underline"
              onClick={onClose}
            >
              Read community guidelines
            </Link>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-2 rounded-lg bg-surface-muted dark:bg-surface-dark text-sm text-text-base dark:text-text-inverted hover:bg-surface-dark dark:hover:bg-surface-muted transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-3 py-2 rounded-lg bg-brand-primary text-white text-sm font-semibold hover:bg-brand-secondary hover:text-text-base transition-colors disabled:opacity-60"
              >
                {isSubmitting ? "Submitting..." : "Submit Report"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ReportShopModal;
