/**
 * Helper to check if an email address belongs to an admin
 * based on EMAIL_ADMIN or NEXT_PUBLIC_EMAIL_ADMIN environment variables.
 */
export function isAdminEmail(email?: string | null): boolean {
  if (!email) return false;
  const adminEnv = process.env.EMAIL_ADMIN || process.env.NEXT_PUBLIC_EMAIL_ADMIN || '';

  const adminEmails = adminEnv
    .split(/[\s,;]+/)
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

  return adminEmails.includes(email.trim().toLowerCase());
}
