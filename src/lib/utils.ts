/**
 * Formats a numeric value as a currency string based on the provided currency code.
 */
export function formatCurrency(value: number, currencyCode: string = "PKR"): string {
  try {
    return new Intl.NumberFormat(navigator.language, {
      style: "currency",
      currency: currencyCode,
    }).format(value);
  } catch (e) {
    // Fallback if the currency code is invalid or not supported
    return `${currencyCode} ${value.toFixed(2)}`;
  }
}

/**
 * Returns the currency symbol for a given code.
 */
export function getCurrencySymbol(currencyCode: string = "USD"): string {
  try {
    const formatter = new Intl.NumberFormat(navigator.language, {
      style: "currency",
      currency: currencyCode,
    });
    const parts = formatter.formatToParts(0);
    return parts.find(part => part.type === "currency")?.value || currencyCode;
  } catch (e) {
    return currencyCode;
  }
}
