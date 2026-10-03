/**
 * Regional & Format Settings — field keys, defaults, and option lists (v1062).
 */

export const REGIONAL_FORMAT_FIELD_KEYS = [
  'country_code',
  'currency_code',
  'date_format',
  'time_zone',
  'decimal_places',
  'number_grouping',
  'first_day_of_week',
  'locale',
  'time_format',
  'fiscal_year_start_month',
  'negative_number_style',
  'percent_decimals',
]

export const REGIONAL_FORMAT_DEFAULTS = {
  country_code: '',
  currency_code: 'USD',
  date_format: 'D MMM YYYY',
  time_zone: 'UTC',
  decimal_places: 2,
  number_grouping: 'locale',
  first_day_of_week: 'monday',
  locale: 'en-US',
  time_format: '24h',
  fiscal_year_start_month: 1,
  negative_number_style: 'minus',
  percent_decimals: 1,
}

export const CURRENCY_OPTIONS = [
  { value: 'USD', label: 'USD — US Dollar' },
  { value: 'EUR', label: 'EUR — Euro' },
  { value: 'GBP', label: 'GBP — British Pound' },
  { value: 'ZAR', label: 'ZAR — South African Rand' },
  { value: 'AUD', label: 'AUD — Australian Dollar' },
  { value: 'CAD', label: 'CAD — Canadian Dollar' },
  { value: 'NZD', label: 'NZD — New Zealand Dollar' },
  { value: 'CHF', label: 'CHF — Swiss Franc' },
  { value: 'JPY', label: 'JPY — Japanese Yen' },
  { value: 'CNY', label: 'CNY — Chinese Yuan' },
  { value: 'INR', label: 'INR — Indian Rupee' },
  { value: 'KES', label: 'KES — Kenyan Shilling' },
  { value: 'NGN', label: 'NGN — Nigerian Naira' },
  { value: 'BWP', label: 'BWP — Botswana Pula' },
  { value: 'MWK', label: 'MWK — Malawian Kwacha' },
  { value: 'ZMW', label: 'ZMW — Zambian Kwacha' },
]

export const DATE_FORMAT_OPTIONS = [
  { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD (2026-09-15)' },
  { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY (15/09/2026)' },
  { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY (09/15/2026)' },
  { value: 'D MMM YYYY', label: 'D MMM YYYY (15 Sep 2026)' },
  { value: 'MMM D, YYYY', label: 'MMM D, YYYY (Sep 15, 2026)' },
]

export const NUMBER_GROUPING_OPTIONS = [
  { value: 'locale', label: 'Follow locale' },
  { value: 'comma', label: 'Comma thousands (1,234.56)' },
  { value: 'space', label: 'Space thousands (1 234.56)' },
  { value: 'none', label: 'No grouping (1234.56)' },
]

export const FIRST_DAY_OPTIONS = [
  { value: 'monday', label: 'Monday' },
  { value: 'sunday', label: 'Sunday' },
  { value: 'saturday', label: 'Saturday' },
]

export const LOCALE_OPTIONS = [
  { value: 'en-US', label: 'English (United States)' },
  { value: 'en-GB', label: 'English (United Kingdom)' },
  { value: 'en-ZA', label: 'English (South Africa)' },
  { value: 'en-AU', label: 'English (Australia)' },
  { value: 'fr-FR', label: 'French (France)' },
  { value: 'de-DE', label: 'German (Germany)' },
  { value: 'pt-PT', label: 'Portuguese (Portugal)' },
  { value: 'es-ES', label: 'Spanish (Spain)' },
]

export const TIME_FORMAT_OPTIONS = [
  { value: '24h', label: '24-hour' },
  { value: '12h', label: '12-hour' },
]

export const NEGATIVE_STYLE_OPTIONS = [
  { value: 'minus', label: 'Minus sign (−1,234.56)' },
  { value: 'parentheses', label: 'Parentheses (1,234.56)' },
]

export const MONTH_OPTIONS = [
  { value: 1, label: 'January' },
  { value: 2, label: 'February' },
  { value: 3, label: 'March' },
  { value: 4, label: 'April' },
  { value: 5, label: 'May' },
  { value: 6, label: 'June' },
  { value: 7, label: 'July' },
  { value: 8, label: 'August' },
  { value: 9, label: 'September' },
  { value: 10, label: 'October' },
  { value: 11, label: 'November' },
  { value: 12, label: 'December' },
]

export const FIELD_LABELS = {
  country_code: 'Country',
  currency_code: 'Currency',
  date_format: 'Date format',
  time_zone: 'Time zone',
  decimal_places: 'Amount decimals',
  number_grouping: 'Number grouping',
  first_day_of_week: 'First day of week',
  locale: 'Display locale',
  time_format: 'Time format',
  fiscal_year_start_month: 'Fiscal year start month',
  negative_number_style: 'Negative number style',
  percent_decimals: 'Percent decimals',
}
