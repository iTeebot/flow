/**
 * Phone number validation utilities
 */

/**
 * Validates a Pakistani phone number
 * Format: 03XX XXXXXXX or +923XX XXXXXXX
 */
export function validatePakistaniPhone(phone: string): boolean {
  const cleanPhone = phone.replace(/\s+/g, '');
  const pakRegex = /^((\+92)|(0092))?3\d{9}$|^03\d{9}$/;
  return pakRegex.test(cleanPhone);
}

/**
 * Validates a US phone number
 * Format: (XXX) XXX-XXXX or XXX-XXX-XXXX or XXXXXXXXXX
 */
export function validateUSPhone(phone: string): boolean {
  const cleanPhone = phone.replace(/\D/g, '');
  return cleanPhone.length === 10 || (cleanPhone.length === 11 && cleanPhone.startsWith('1'));
}

/**
 * Generic phone validation for other countries
 * Just checks if it has a reasonable number of digits
 */
export function validateGenericPhone(phone: string): boolean {
  const cleanPhone = phone.replace(/\D/g, '');
  return cleanPhone.length >= 7 && cleanPhone.length <= 15;
}
