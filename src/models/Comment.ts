export const REACTION_TYPES = [
  "like",
  "love",
  "care",
  "haha",
  "wow",
  "angry",
  "sad",
] as const;

export type ReactionType = (typeof REACTION_TYPES)[number];

export type ReactionCounts = Partial<Record<ReactionType, number>>;

export interface Comment {
  id: number;
  shopId: number;
  userId: number;
  body: string;
  dateCreated: string;
  dateModified?: string | null;
  userName?: string | null;
  userAvatar?: string | null;
  userEmail?: string | null;
  reactionCounts?: ReactionCounts;
  userReaction?: ReactionType | null;
}
