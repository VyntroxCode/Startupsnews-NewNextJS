/**
 * The JWT signing secret shared by admin, employee and reader tokens.
 * There is deliberately no fallback value: a missing secret must fail loudly instead of
 * silently signing tokens with a string that is published in the source code.
 */
export function requireJwtSecret(): string {
  const secret = process.env.JWT_SECRET?.trim();
  if (!secret) {
    throw new Error('JWT_SECRET environment variable is required and cannot be empty');
  }
  return secret;
}
