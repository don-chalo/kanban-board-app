export type EmailValidationResult =
  | { ok: true; value: string }
  | { ok: false; error: string };

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateEmail(input: string): EmailValidationResult {
  const value = input.trim().toLowerCase();
  if (value.length === 0) {
    return { ok: false, error: "Email is required." };
  }
  if (!EMAIL_PATTERN.test(value)) {
    return { ok: false, error: "Enter a valid email." };
  }
  return { ok: true, value };
}