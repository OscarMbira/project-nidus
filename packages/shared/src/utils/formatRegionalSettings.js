/**
 * Format dates/numbers/currency using a resolved Regional & Format pack (v1062).
 */

import { REGIONAL_FORMAT_DEFAULTS } from './regionalFormatConstants.js'

function settingsOrDefault(settings) {
  return { ...REGIONAL_FORMAT_DEFAULTS, ...(settings || {}) }
}

function dateFormatToIntl(dateFormat) {
  switch (dateFormat) {
    case 'YYYY-MM-DD':
      return { year: 'numeric', month: '2-digit', day: '2-digit' }
    case 'DD/MM/YYYY':
      return { year: 'numeric', month: '2-digit', day: '2-digit' }
    case 'MM/DD/YYYY':
      return { year: 'numeric', month: '2-digit', day: '2-digit' }
    case 'MMM D, YYYY':
      return { year: 'numeric', month: 'short', day: 'numeric' }
    case 'D MMM YYYY':
    default:
      return { year: 'numeric', month: 'short', day: 'numeric' }
  }
}

/**
 * @param {string|number|Date} value
 * @param {object} [settings]
 */
export function formatRegionalDate(value, settings) {
  if (value == null || value === '') return ''
  const s = settingsOrDefault(settings)
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)

  const opts = dateFormatToIntl(s.date_format)
  try {
    let formatted = new Intl.DateTimeFormat(s.locale || 'en-US', {
      ...opts,
      timeZone: s.time_zone || undefined,
    }).format(date)
    // Normalise separators for explicit slash formats
    if (s.date_format === 'YYYY-MM-DD') {
      const y = date.toLocaleString('en-CA', { timeZone: s.time_zone, year: 'numeric' })
      const m = date.toLocaleString('en-CA', { timeZone: s.time_zone, month: '2-digit' })
      const d = date.toLocaleString('en-CA', { timeZone: s.time_zone, day: '2-digit' })
      return `${y}-${m}-${d}`
    }
    if (s.date_format === 'DD/MM/YYYY' || s.date_format === 'MM/DD/YYYY') {
      const parts = new Intl.DateTimeFormat(s.locale || 'en-GB', {
        ...opts,
        timeZone: s.time_zone || undefined,
      }).formatToParts(date)
      const get = (t) => parts.find((p) => p.type === t)?.value || ''
      if (s.date_format === 'DD/MM/YYYY') return `${get('day')}/${get('month')}/${get('year')}`
      return `${get('month')}/${get('day')}/${get('year')}`
    }
    return formatted
  } catch {
    return String(value)
  }
}

function applyGrouping(numericString, grouping) {
  if (grouping === 'none') return numericString.replace(/,/g, '').replace(/\s/g, '')
  if (grouping === 'space') return numericString.replace(/,/g, ' ')
  if (grouping === 'comma') return numericString.replace(/\s/g, ',')
  return numericString
}

/**
 * @param {number|string} value
 * @param {object} [settings]
 * @param {{ style?: 'decimal'|'currency'|'percent', currencyCode?: string }} [opts]
 */
export function formatRegionalNumber(value, settings, opts = {}) {
  if (value == null || value === '') return ''
  const n = Number(value)
  if (Number.isNaN(n)) return String(value)
  const s = settingsOrDefault(settings)
  const style = opts.style || 'decimal'
  const fraction =
    style === 'percent'
      ? Number(s.percent_decimals ?? 1)
      : Number(s.decimal_places ?? 2)

  const abs = Math.abs(n)
  let formatted
  try {
    if (style === 'currency') {
      formatted = new Intl.NumberFormat(s.locale || 'en-US', {
        style: 'currency',
        currency: opts.currencyCode || s.currency_code || 'USD',
        minimumFractionDigits: fraction,
        maximumFractionDigits: fraction,
      }).format(abs)
    } else if (style === 'percent') {
      formatted = new Intl.NumberFormat(s.locale || 'en-US', {
        style: 'percent',
        minimumFractionDigits: fraction,
        maximumFractionDigits: fraction,
      }).format(abs / 100)
    } else {
      formatted = new Intl.NumberFormat(s.locale || 'en-US', {
        minimumFractionDigits: fraction,
        maximumFractionDigits: fraction,
        useGrouping: s.number_grouping !== 'none',
      }).format(abs)
    }
  } catch {
    formatted = String(abs)
  }

  formatted = applyGrouping(formatted, s.number_grouping)

  if (n < 0) {
    if (s.negative_number_style === 'parentheses') return `(${formatted})`
    return `-${formatted.replace(/^-/, '')}`
  }
  return formatted
}

/**
 * Currency with resolved settings; falls back to `$` + grouped number if Intl currency fails.
 * @param {number|string} value
 * @param {object} [settings]
 */
export function formatRegionalCurrency(value, settings) {
  if (value == null || value === '') return ''
  const s = settingsOrDefault(settings)
  const code = s.currency_code || 'USD'
  try {
    return formatRegionalNumber(value, s, { style: 'currency', currencyCode: code })
  } catch {
    const n = Number(value)
    if (Number.isNaN(n)) return String(value)
    const body = formatRegionalNumber(Math.abs(n), { ...s, currency_code: code }, { style: 'decimal' })
    const withSymbol = `$${body}`
    return n < 0 && s.negative_number_style === 'parentheses' ? `(${withSymbol})` : n < 0 ? `-${withSymbol}` : withSymbol
  }
}
