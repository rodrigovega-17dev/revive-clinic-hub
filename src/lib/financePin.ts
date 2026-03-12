/**
 * Finance/Payroll 4-digit PIN: salt + SHA-256 hash.
 * PIN must be exactly 4 digits; validation is done by callers.
 */

const PIN_LENGTH = 4;
const PIN_REGEX = /^\d{4}$/;

export function isValidPin(pin: string): boolean {
  return PIN_REGEX.test(pin);
}

/** Generate a random salt (hex string) for hashing the PIN. */
export function generateSalt(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

/** Hash PIN with salt using SHA-256; returns hex string. */
export async function hashPin(salt: string, pin: string): Promise<string> {
  const data = new TextEncoder().encode(salt + pin);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash), (b) => b.toString(16).padStart(2, '0')).join('');
}

/** Verify entered PIN against stored salt and hash. */
export async function verifyPin(enteredPin: string, salt: string, hash: string): Promise<boolean> {
  if (!salt || !hash) return false;
  const computed = await hashPin(salt, enteredPin);
  return computed === hash;
}

export { PIN_LENGTH };
