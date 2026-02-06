/**
 * Safe client-side user metadata that excludes all sensitive authentication fields.
 * This represents the subset of user data that is safe to store and display on the client.
 *
 * NEVER include in this type:
 * - hashedPassword
 * - verificationToken
 * - resetToken
 * - tokenExpiry
 * - Any other backend-only authentication fields
 */
export interface SafeUserMetadata {
  id: number;
  firebaseUid: string;
  email: string;
  username: string | null;
  verified: boolean;
  firstName: string | null;
  lastName: string | null;
  role: string;
  membershipStatus: string;
  accountStatus: string;
  avatar: string | null;
  dateCreated?: string;
  lastLogin?: string | null;
}
