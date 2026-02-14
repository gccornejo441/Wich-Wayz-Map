export interface UsernameValidationResult {
  ok: boolean;
  reason?: string;
}

export function validateUsername(username: string): UsernameValidationResult;
export function sanitizeUsername(username: string): string;
export function generateRedditStyleUsername(seed?: string): string;
export function applyCollisionSuffix(base: string, attempt: number): string;
