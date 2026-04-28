/**
 * Formats raw digits into a Pakistani CNIC pattern: XXXXX-XXXXXXX-X
 */
export const formatPakistaniCNIC = (val: string): string => {
  const digits = val.replace(/\D/g, "").slice(0, 13);
  let res = "";
  if (digits.length > 0) res += digits.substring(0, 5);
  if (digits.length > 5) res += "-" + digits.substring(5, 12);
  if (digits.length > 12) res += "-" + digits.substring(12, 13);
  return res;
};

/**
 * Strips all non-digit characters from a string.
 */
export const stripNonDigits = (val: string): string => {
  return val.replace(/\D/g, "");
};

/**
 * Strips all non-alphanumeric characters from a string.
 */
export const stripNonAlphaNumeric = (val: string): string => {
  return val.replace(/[^a-zA-Z0-9]/g, "");
};
