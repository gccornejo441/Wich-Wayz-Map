export type BrandStatus = "allowed" | "blocked" | "needs_review" | "unknown";

export type ModalState =
  | { kind: "none" }
  | { kind: "blockBrand"; brandKey: string }
  | { kind: "rejectSubmission"; submissionId: number };
