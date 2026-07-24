/**
 * Amount Shorthand Utilities
 *
 * Provides functions to parse and format shorthand amount notations
 * like 10k (10,000), 3m (3,000,000), 2b (2,000,000,000)
 *
 * @module utils/amountShorthand
 */

/**
 * Multiplier map for shorthand suffixes
 * Both lowercase and uppercase are supported
 */
const MULTIPLIERS = {
  // Thousand (k and t are common alternatives)
  k: 1000,
  K: 1000,
  t: 1000,
  T: 1000,
  // Million
  m: 1000000,
  M: 1000000,
  // Billion
  b: 1000000000,
  B: 1000000000,
  // Trillion (using 'tr' to avoid confusion)
  tr: 1000000000000,
  TR: 1000000000000,
  Tr: 1000000000000,
};

/**
 * Regular expression to match shorthand amount patterns
 * Matches: optional negative sign, number (with optional decimals), suffix
 * Examples: 10k, 3.5m, -2b, 1.25tr
 */
const SHORTHAND_REGEX = /^(-?\d+\.?\d*)(k|K|t|T|m|M|b|B|tr|TR|Tr)$/;

/**
 * Parse a shorthand amount string to its numeric value
 *
 * @param {string} input - The user input string (e.g., "10k", "3.5m", "-2b")
 * @returns {{ value: number | null, wasShorthand: boolean, original: string }}
 *          Object containing parsed value, whether it was shorthand, and original input
 *
 * @example
 * parseShorthandAmount("10k")   // { value: 10000, wasShorthand: true, original: "10k" }
 * parseShorthandAmount("3.5m")  // { value: 3500000, wasShorthand: true, original: "3.5m" }
 * parseShorthandAmount("100")   // { value: 100, wasShorthand: false, original: "100" }
 * parseShorthandAmount("abc")   // { value: null, wasShorthand: false, original: "abc" }
 */
export function parseShorthandAmount(input) {
  if (input === null || input === undefined || input === '') {
    return { value: null, wasShorthand: false, original: String(input || '') };
  }

  const trimmedInput = String(input).trim();

  // Check if it matches shorthand pattern
  const match = trimmedInput.match(SHORTHAND_REGEX);

  if (match) {
    const numericPart = parseFloat(match[1]);
    const suffix = match[2];
    const multiplier = MULTIPLIERS[suffix] || MULTIPLIERS[suffix.toLowerCase()];

    if (!isNaN(numericPart) && multiplier) {
      const result = numericPart * multiplier;
      return {
        value: result,
        wasShorthand: true,
        original: trimmedInput,
      };
    }
  }

  // Try parsing as regular number (must be valid number format only)
  // Use strict number validation to reject strings like "10x"
  const numberRegex = /^-?\d+(\.\d+)?$/;
  if (numberRegex.test(trimmedInput)) {
    const numericValue = parseFloat(trimmedInput);
    if (!isNaN(numericValue)) {
      return {
        value: numericValue,
        wasShorthand: false,
        original: trimmedInput,
      };
    }
  }

  // Invalid input
  return {
    value: null,
    wasShorthand: false,
    original: trimmedInput,
  };
}

/**
 * Check if a string contains a shorthand suffix
 *
 * @param {string} input - The input string to check
 * @returns {boolean} True if the input contains a shorthand suffix
 */
export function hasShorthandSuffix(input) {
  if (!input) return false;
  return SHORTHAND_REGEX.test(String(input).trim());
}

/**
 * Get the shorthand suffix from an input string
 *
 * @param {string} input - The input string
 * @returns {string | null} The suffix if found, null otherwise
 */
export function getShorthandSuffix(input) {
  if (!input) return null;
  const match = String(input).trim().match(SHORTHAND_REGEX);
  return match ? match[2] : null;
}

/**
 * Format a number to shorthand notation
 *
 * @param {number} value - The numeric value to format
 * @param {object} options - Formatting options
 * @param {number} options.decimals - Number of decimal places (default: 1)
 * @param {boolean} options.lowercase - Use lowercase suffix (default: false)
 * @param {number} options.threshold - Minimum value to apply shorthand (default: 1000)
 * @returns {string} Formatted shorthand string
 *
 * @example
 * formatToShorthand(10000)      // "10K"
 * formatToShorthand(3500000)    // "3.5M"
 * formatToShorthand(500)        // "500" (below threshold)
 */
export function formatToShorthand(value, options = {}) {
  const {
    decimals = 1,
    lowercase = false,
    threshold = 1000,
  } = options;

  if (value === null || value === undefined || isNaN(value)) {
    return '';
  }

  const absValue = Math.abs(value);
  const sign = value < 0 ? '-' : '';

  // Below threshold, return as-is
  if (absValue < threshold) {
    return String(value);
  }

  let suffix = '';
  let divisor = 1;

  if (absValue >= 1000000000000) {
    suffix = lowercase ? 'tr' : 'TR';
    divisor = 1000000000000;
  } else if (absValue >= 1000000000) {
    suffix = lowercase ? 'b' : 'B';
    divisor = 1000000000;
  } else if (absValue >= 1000000) {
    suffix = lowercase ? 'm' : 'M';
    divisor = 1000000;
  } else if (absValue >= 1000) {
    suffix = lowercase ? 'k' : 'K';
    divisor = 1000;
  }

  const shortValue = absValue / divisor;
  const formatted = shortValue % 1 === 0
    ? shortValue.toString()
    : shortValue.toFixed(decimals).replace(/\.?0+$/, '');

  return `${sign}${formatted}${suffix}`;
}

/**
 * Format a number with locale-aware thousands separators
 *
 * @param {number} value - The numeric value to format
 * @param {object} options - Formatting options
 * @param {number} options.decimals - Number of decimal places (default: 2)
 * @param {string} options.locale - Locale for formatting (default: 'en-US')
 * @returns {string} Formatted string with separators
 *
 * @example
 * formatWithSeparators(10000)      // "10,000.00"
 * formatWithSeparators(3500000.5)  // "3,500,000.50"
 */
export function formatWithSeparators(value, options = {}) {
  const {
    decimals = 2,
    locale = 'en-US',
  } = options;

  if (value === null || value === undefined || isNaN(value)) {
    return '';
  }

  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

/**
 * Format a number as currency with shorthand support
 *
 * @param {number} value - The numeric value to format
 * @param {object} options - Formatting options
 * @param {string} options.currency - Currency code (default: 'USD')
 * @param {string} options.locale - Locale for formatting (default: 'en-US')
 * @param {boolean} options.useShorthand - Use shorthand notation for large values
 * @param {number} options.shorthandThreshold - Minimum value for shorthand (default: 1000000)
 * @returns {string} Formatted currency string
 */
export function formatCurrency(value, options = {}) {
  const {
    currency = 'USD',
    locale = 'en-US',
    useShorthand = false,
    shorthandThreshold = 1000000,
  } = options;

  if (value === null || value === undefined || isNaN(value)) {
    return '';
  }

  if (useShorthand && Math.abs(value) >= shorthandThreshold) {
    const shorthand = formatToShorthand(value, { decimals: 1 });
    const currencySymbol = getCurrencySymbol(currency, locale);
    return `${currencySymbol}${shorthand}`;
  }

  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currency,
  }).format(value);
}

/**
 * Get currency symbol for a given currency code
 *
 * @param {string} currency - Currency code (e.g., 'USD', 'EUR')
 * @param {string} locale - Locale for formatting (default: 'en-US')
 * @returns {string} Currency symbol
 */
export function getCurrencySymbol(currency, locale = 'en-US') {
  const formatter = new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });

  // Extract symbol from formatted number
  const parts = formatter.formatToParts(0);
  const symbolPart = parts.find(part => part.type === 'currency');
  return symbolPart ? symbolPart.value : currency;
}

/**
 * Validate if a value is within specified range
 *
 * @param {number} value - The value to validate
 * @param {object} options - Validation options
 * @param {number} options.min - Minimum allowed value
 * @param {number} options.max - Maximum allowed value
 * @returns {{ valid: boolean, error: string | null }}
 */
export function validateAmountRange(value, options = {}) {
  const { min, max } = options;

  if (value === null || value === undefined || isNaN(value)) {
    return { valid: false, error: 'Invalid number' };
  }

  if (min !== undefined && value < min) {
    return { valid: false, error: `Value must be at least ${formatWithSeparators(min, { decimals: 0 })}` };
  }

  if (max !== undefined && value > max) {
    return { valid: false, error: `Value must not exceed ${formatWithSeparators(max, { decimals: 0 })}` };
  }

  return { valid: true, error: null };
}

/**
 * Get hint text for shorthand input
 *
 * @param {string} input - Current input value
 * @returns {string | null} Hint text if shorthand detected, null otherwise
 */
export function getConversionHint(input) {
  if (!input) return null;

  const result = parseShorthandAmount(input);

  if (result.wasShorthand && result.value !== null) {
    return `Press Enter to convert ${input} → ${formatWithSeparators(result.value, { decimals: 0 })}`;
  }

  return null;
}

/**
 * Available shorthand suffixes for display
 */
export const SHORTHAND_SUFFIXES = [
  { suffix: 'k', multiplier: 1000, name: 'Thousand', example: '10k = 10,000' },
  { suffix: 't', multiplier: 1000, name: 'Thousand', example: '10t = 10,000' },
  { suffix: 'm', multiplier: 1000000, name: 'Million', example: '3m = 3,000,000' },
  { suffix: 'b', multiplier: 1000000000, name: 'Billion', example: '2b = 2,000,000,000' },
  { suffix: 'tr', multiplier: 1000000000000, name: 'Trillion', example: '1tr = 1,000,000,000,000' },
];

export default {
  parseShorthandAmount,
  hasShorthandSuffix,
  getShorthandSuffix,
  formatToShorthand,
  formatWithSeparators,
  formatCurrency,
  getCurrencySymbol,
  validateAmountRange,
  getConversionHint,
  SHORTHAND_SUFFIXES,
};
