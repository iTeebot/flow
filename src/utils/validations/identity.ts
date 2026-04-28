/**
 * Validates a Pakistani CNIC (13 digits).
 * Strips dashes and spaces before validation.
 */
export const validatePakistaniCNIC = (cnic: string): boolean => {
  const clean = cnic.replace(/[-\s]/g, "");
  return /^\d{13}$/.test(clean);
};

/**
 * Validates a Pakistani NTN (7 characters, alphanumeric).
 * Strips dashes and spaces before validation.
 */
export const validatePakistaniNTN = (ntn: string): boolean => {
  const clean = ntn.replace(/[-\s]/g, "");
  return /^[a-zA-Z0-9]{7}$/.test(clean);
};
