/**
 * Rules for a customer's own password, shared by the server (which enforces them) and the set / reset screens (which show
 * the same checks as the person types). Kept easy on purpose: 8 or more characters, not an obvious one.
 */
export const PASSWORD_MIN = 8;
export const PASSWORD_MAX = 72;

export type PasswordIssue = 'short' | 'long' | 'weak' | 'phone';

/** The first problem with a password, or null when it is fine. `phone` is the customer's number in any form (digits are compared). */
export function passwordIssue(password: string, phone?: string): PasswordIssue | null {
  if (password.length < PASSWORD_MIN) return 'short';
  if (password.length > PASSWORD_MAX) return 'long';
  if (new Set(password).size === 1) return 'weak'; // 11111111
  if (/^(?:0123456789|1234567890|12345678|87654321|password|password1|qwertyui)/i.test(password) && password.length <= 10) return 'weak';
  const digits = phone?.replace(/\D/g, '') ?? '';
  const local = digits.slice(-10);
  if (local && password.replace(/\D/g, '').includes(local)) return 'phone';
  return null;
}

/** Bilingual wording of each problem, for the screens. */
export const PASSWORD_ISSUE_TEXT: Record<PasswordIssue, { bn: string; en: string }> = {
  short: { bn: `পাসওয়ার্ডে অন্তত ${PASSWORD_MIN}টি অক্ষর লাগবে`, en: `Use at least ${PASSWORD_MIN} characters` },
  long: { bn: 'পাসওয়ার্ডটি অনেক বড়', en: 'That password is too long' },
  weak: { bn: 'এটি সহজে অনুমান করা যায়। অন্য একটি দিন', en: 'That is too easy to guess. Choose another' },
  phone: { bn: 'পাসওয়ার্ডে মোবাইল নম্বর রাখবেন না', en: 'Do not use your phone number in the password' },
};
