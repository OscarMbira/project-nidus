/**
 * Field-level contextual help — pure helpers (v1345).
 * PRD projectprd/v1345_field_level_contextual_help_PRD.md (G-D6, G-D7, G-D11, G-D12).
 */
import { formatRegionalDate } from './formatRegionalSettings.js'
import { REGIONAL_FORMAT_DEFAULTS } from './regionalFormatConstants.js'

/**
 * v1345 slice 1b (CF-D2): help on a user-created field is complete when it has a purpose and an
 * example. Accepts { help_purpose, help_example } (definitions) — "help" is the old optional text and
 * counts as the purpose.
 */
export function isFieldHelpComplete(def) {
  const purpose = String(def?.help_purpose || def?.help || '').trim()
  const example = String(def?.help_example || '').trim()
  return Boolean(purpose && example)
}

/**
 * Popover help for a user-created field from its own definition (CF-D5), or null when it has no
 * purpose yet (no ⓘ — D10). Works for custom field / local field definitions and form template fields.
 */
export function inlineHelpFromDefinition(def) {
  if (!def) return null
  const purpose = String(def.help_purpose || def.help || def.description || '').trim()
  if (!purpose) return null
  return {
    title: String(def.label || def.field_label || def.key || 'Field').replace(/\s*\*\s*$/, ''),
    purpose,
    examples: String(def.help_example || '').trim(),
    format_notes: String(def.help_format || '').trim() || null,
    extra_notes: null,
  }
}

/** Rule 36 amount shorthand, added automatically to amount fields (G-D6). */
export const AMOUNT_SHORTHAND_NOTE = 'Tip: type 10t for 10,000 or 3m for 3,000,000, then press Enter.'

const EXAMPLE_DATE = '2027-03-15T12:00:00'

/**
 * Replace regional tokens with the user's resolved settings (rule 68).
 * Unknown tokens are left as written.
 * @param {string|null|undefined} text
 * @param {object|null} settings resolved regional pack (null → defaults)
 */
export function resolveFieldHelpTokens(text, settings) {
  if (!text) return ''
  const s = { ...REGIONAL_FORMAT_DEFAULTS, ...(settings || {}) }
  const values = {
    date_format: s.date_format,
    example_date: formatRegionalDate(EXAMPLE_DATE, s),
    currency: s.currency_code,
    decimals: s.amount_decimals == null ? '' : String(s.amount_decimals),
  }
  return String(text).replace(/\{([a-z_]+)\}/g, (match, token) => (values[token] != null && values[token] !== '' ? values[token] : match))
}

/**
 * Split help text into blocks: paragraphs and bullet lists ("- " lines). Returns plain strings
 * only — rendered as React text, never as HTML (G-D12).
 * @returns {{ type: 'p', text: string } | { type: 'ul', items: string[] }}[]
 */
export function parseFieldHelpText(text) {
  const blocks = []
  let list = null
  for (const raw of String(text || '').split(/\r?\n/)) {
    const line = raw.trim()
    if (!line) { list = null; continue }
    if (line.startsWith('- ')) {
      if (!list) { list = { type: 'ul', items: [] }; blocks.push(list) }
      list.items.push(line.slice(2).trim())
    } else {
      list = null
      blocks.push({ type: 'p', text: line })
    }
  }
  return blocks
}

/**
 * Rules shown in the popover, derived from the live field definition (G-D7) — never stored text.
 * @param {{ required?: boolean, maxLength?: number, min?: number, max?: number,
 *   options?: (string|{label?: string, value?: string})[], isAmount?: boolean }} rules
 * @returns {string[]}
 */
export function buildFieldHelpRules({ required, maxLength, min, max, options, isAmount } = {}) {
  const lines = []
  if (required === true) lines.push('Required.')
  else if (required === false) lines.push('Optional.')
  if (Number.isFinite(maxLength) && maxLength > 0) lines.push(`Up to ${maxLength} characters.`)
  if (Number.isFinite(min) && Number.isFinite(max)) lines.push(`Between ${min} and ${max}.`)
  else if (Number.isFinite(min)) lines.push(`At least ${min}.`)
  else if (Number.isFinite(max)) lines.push(`At most ${max}.`)
  if (Array.isArray(options)) {
    const labels = options
      .map((o) => (typeof o === 'string' ? o : (o?.label ?? o?.value ?? '')))
      .map((l) => String(l).trim())
      .filter((l) => l && l !== '—' && l.toLowerCase() !== 'not specified')
    if (labels.length) {
      const shown = labels.slice(0, 12)
      const more = labels.length - shown.length
      lines.push(`Choose from: ${shown.join(', ')}${more > 0 ? ` (+${more} more)` : ''}.`)
    }
  }
  if (isAmount) lines.push(AMOUNT_SHORTHAND_NOTE)
  return lines
}

/**
 * Learn more link (G-D11, PD4): only app articles or documentation guides, never a free URL.
 * @param {{ kind?: string|null, key?: string|null, app?: string }} args
 * @returns {string|null}
 */
export function buildLearnMoreHref({ kind, key, app = 'platform' } = {}) {
  const k = String(key || '').trim()
  if (!k || /[\s<>"']/.test(k) || /^[a-z]+:/i.test(k) || k.startsWith('//')) return null
  if (kind === 'article') {
    // The article page exists in Platform and Simulator only (PD4); the Planner shows no link.
    if (app === 'planner') return null
    const prefix = app === 'simulator' ? '/simulator' : '/platform'
    return `${prefix}/help/articles/${encodeURIComponent(k)}`
  }
  if (kind === 'documentation') {
    const [guide, section] = k.split('#')
    if (!/^[a-z0-9-]+$/i.test(guide)) return null
    const docApp = app === 'simulator' ? 'simulator' : 'platform'
    return `/documentation/${docApp}/${guide}${section ? `#${encodeURIComponent(section)}` : ''}`
  }
  return null
}
