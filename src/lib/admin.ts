/**
 * Helper to check if an email address belongs to an admin
 * based on NEXT_PUBLIC_EMAIL_ADMIN or EMAIL_ADMIN environment variables.
 */
export function isAdminEmail(email?: string | null): boolean {
  if (!email) return false;
  const adminEnv =
    process.env.NEXT_PUBLIC_EMAIL_ADMIN ||
    process.env.EMAIL_ADMIN ||
    'hi.cyril@gmail.com puissancedamour@yahoo.fr legion.athenienne@gmail.com';

  const adminEmails = adminEnv
    .split(/[\s,;]+/)
    .map(e => e.trim().toLowerCase())
    .filter(Boolean);

  return adminEmails.includes(email.trim().toLowerCase());
}
