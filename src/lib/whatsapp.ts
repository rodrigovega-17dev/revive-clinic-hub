/**
 * WhatsApp Click-to-Chat utility.
 * Generates wa.me URLs with prefilled messages - no API integration required.
 */

/** Default country code when phone lacks one (Mexico). */
const DEFAULT_COUNTRY_CODE = '52';

/**
 * Format phone for WhatsApp (E.164-like).
 * Strips non-digits, adds country code if missing.
 */
export function formatPhoneForWhatsApp(phone: string, defaultCountryCode = DEFAULT_COUNTRY_CODE): string {
  const digits = (phone || '').replace(/\D/g, '');
  if (!digits.length) return '';
  // Already has country code (starts with 1-3 digits)
  if (digits.length >= 10 && (digits.startsWith('1') || digits.startsWith('52') || digits.startsWith('34'))) {
    return digits;
  }
  // Prepend default country code
  return `${defaultCountryCode}${digits}`;
}

/**
 * Generate WhatsApp click-to-chat URL.
 * @param phone - Raw phone number (will be normalized)
 * @param message - Prefilled message (will be URL-encoded)
 */
export function getWhatsAppUrl(phone: string, message: string): string {
  const formatted = formatPhoneForWhatsApp(phone);
  if (!formatted) return '';
  const encoded = encodeURIComponent(message);
  return `https://wa.me/${formatted}${encoded ? `?text=${encoded}` : ''}`;
}

/**
 * Open WhatsApp in new tab with prefilled message.
 */
export function openWhatsApp(phone: string, message: string): void {
  const url = getWhatsAppUrl(phone, message);
  if (url) window.open(url, '_blank', 'noopener,noreferrer');
}
