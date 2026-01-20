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
}
