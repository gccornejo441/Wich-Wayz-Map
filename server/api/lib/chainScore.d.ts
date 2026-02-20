export interface ChainScoreInput {
  shopName?: string;
  websiteUrl?: string;
  internalCount?: number;
  chainAttestation?: "no" | "yes" | "unsure";
  estimatedLocationCount?: "lt10" | "gte10" | "unsure";
  knownBrandStatus?: "unknown" | "allowed" | "blocked" | "needs_review";
  knownLocationCount?: number;
}

export interface ChainScoreResult {
  score: number;
  decision: "allow" | "review" | "block";
  reasons: string[];
}

export function scoreChainLikelihood(input: ChainScoreInput): ChainScoreResult;
