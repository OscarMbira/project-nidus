/**
 * Locale-aware display formatting (Tier 1 of the multi-language plan).
 *
 * These wrap the native Intl APIs to format *display* values (dates, plain
 * numbers) for the viewer's chosen language. They never touch how values are
 * parsed or stored — only how they're rendered. Currency formatting already
 * exists in ./amountShorthand.js (formatCurrency/formatWithSeparators, both
 * locale-aware) and is reused rather than duplicated here.
 *
 * @module utils/localeFormat
 */

export const DEFAULT_LOCALE = 'en-US'

/**
 * Format a date value for display in the given locale.
 *
 * @param {string|number|Date} value - ISO date string, timestamp, or Date
 * @param {string} [locale] - BCP-47 locale tag (defaults to en-US)
 * @param {Intl.DateTimeFormatOptions} [options] - overrides for Intl.DateTimeFormat
 * @returns {string} Formatted date, or '' for empty/invalid input
 */
export function formatLocaleDate(value, locale = DEFAULT_LOCALE, options = {}) {
  if (value === null || value === undefined || value === '') return ''

  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)

  try {
    return new Intl.DateTimeFormat(locale || DEFAULT_LOCALE, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      ...options,
    }).format(date)
  } catch {
    return new Intl.DateTimeFormat(DEFAULT_LOCALE, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      ...options,
    }).format(date)
  }
}

/**
 * Format a plain (non-currency) number for display in the given locale.
 *
 * @param {number|string} value
 * @param {string} [locale] - BCP-47 locale tag (defaults to en-US)
 * @param {Intl.NumberFormatOptions} [options]
 * @returns {string} Formatted number, or '' for empty/invalid input
 */
export function formatLocaleNumber(value, locale = DEFAULT_LOCALE, options = {}) {
  if (value === null || value === undefined || value === '') return ''
  const numeric = Number(value)
  if (Number.isNaN(numeric)) return ''

  try {
    return new Intl.NumberFormat(locale || DEFAULT_LOCALE, options).format(numeric)
  } catch {
    return new Intl.NumberFormat(DEFAULT_LOCALE, options).format(numeric)
  }
}

export default {
  DEFAULT_LOCALE,
  formatLocaleDate,
  formatLocaleNumber,
}
