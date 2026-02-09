export const REPORT_REASON_ORDER = [
  "spam",
  "wrong_location",
  "closed",
  "duplicate",
] as const;

export type ReportReason = (typeof REPORT_REASON_ORDER)[number];

export const MODERATOR_OUTCOME_ORDER = [
  "action_taken",
  "no_action_needed",
  "needs_more_information",
] as const;

export type ModeratorOutcome = (typeof MODERATOR_OUTCOME_ORDER)[number];

export const MODERATION_ACTION_ORDER = [
  "hide_shop",
  "unlist_shop",
  "update_location_data",
  "update_location_status",
  "mark_canonical",
  "hide_duplicate",
] as const;

export type ModerationAction = (typeof MODERATION_ACTION_ORDER)[number];

export interface ModeratorOutcomeDefinition {
  label: string;
  description: string;
}

export interface ModerationActionDefinition {
  label: string;
  description: string;
}

export interface ReportReasonDefinition {
  label: string;
  description: string;
  moderatorOutcome: ModeratorOutcome;
}

export const MODERATOR_OUTCOMES: Record<
  ModeratorOutcome,
  ModeratorOutcomeDefinition
> = {
  action_taken: {
    label: "Action taken",
    description:
      "The report is confirmed and a moderation action is applied to the listing.",
  },
  no_action_needed: {
    label: "No action needed",
    description:
      "The report is reviewed but does not meet policy criteria for enforcement.",
  },
  needs_more_information: {
    label: "Needs more information",
    description:
      "The report is incomplete; moderators request additional evidence before deciding.",
  },
};

export const MODERATION_ACTIONS: Record<
  ModerationAction,
  ModerationActionDefinition
> = {
  hide_shop: {
    label: "Hide shop",
    description:
      "Remove the shop from public map and search results while preserving internal records.",
  },
  unlist_shop: {
    label: "Unlist shop",
    description:
      "Keep the shop data available for admins but remove it from normal public discovery.",
  },
  update_location_data: {
    label: "Update location data",
    description:
      "Correct latitude/longitude and related address metadata on the affected listing.",
  },
  update_location_status: {
    label: "Update location status",
    description:
      "Set the location status to the appropriate value (for example permanently closed).",
  },
  mark_canonical: {
    label: "Mark canonical shop",
    description:
      "Choose and retain the authoritative listing when duplicate reports are confirmed.",
  },
  hide_duplicate: {
    label: "Hide duplicate listing",
    description:
      "Hide the non-canonical duplicate so users see only the canonical shop record.",
  },
};

export const REPORT_REASON_DEFINITIONS: Record<
  ReportReason,
  ReportReasonDefinition
> = {
  spam: {
    label: "Spam",
    description:
      "Listing appears promotional, malicious, or intentionally irrelevant to sandwich discovery.",
    moderatorOutcome: "action_taken",
  },
  wrong_location: {
    label: "Wrong location",
    description:
      "Listing points to an incorrect address or map coordinates for the actual shop.",
    moderatorOutcome: "action_taken",
  },
  closed: {
    label: "Closed",
    description:
      "Shop location is no longer operating and should be marked with a closed status.",
    moderatorOutcome: "action_taken",
  },
  duplicate: {
    label: "Duplicate",
    description:
      "Multiple listings represent the same real-world shop and should be merged.",
    moderatorOutcome: "action_taken",
  },
};

export const REPORT_REASON_ACTION_MAP: Record<
  ReportReason,
  readonly ModerationAction[]
> = {
  spam: ["hide_shop", "unlist_shop"],
  wrong_location: ["update_location_data"],
  closed: ["update_location_status"],
  duplicate: ["mark_canonical", "hide_duplicate"],
};
