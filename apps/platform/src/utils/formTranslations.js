/**
 * Field label / select-option translation lookup with fallback to the
 * schema's default (English) label. Pure functions — no data fetching here;
 * callers pass in rows already fetched for a template (see
 * formEngineService.getFieldTranslations in each app).
 *
 * @module utils/formTranslations
 */

/**
 * Build a lookup index for one language from a flat list of translation rows.
 *
 * @param {Array<{section_key:string, field_key:string, language_code:string, label:string|null, option_labels:object}>} translationRows
 * @param {string} languageCode
 * @returns {Map<string, {label:string|null, option_labels:object}>} keyed by "sectionKey::fieldKey"
 */
export function buildTranslationIndex(translationRows, languageCode) {
  const index = new Map()
  if (!languageCode) return index

  for (const row of translationRows || []) {
    if (row?.language_code !== languageCode) continue
    index.set(`${row.section_key}::${row.field_key}`, {
      label: row.label || null,
      option_labels: row.option_labels || {},
    })
  }
  return index
}

/**
 * Resolve a field's label: translated label if present and non-blank,
 * otherwise the schema's default label.
 *
 * @param {{key:string,label:string}} field
 * @param {Map} translationIndex - from buildTranslationIndex
 * @param {string} sectionKey
 * @returns {string}
 */
export function resolveFieldLabel(field, translationIndex, sectionKey) {
  const entry = translationIndex?.get(`${sectionKey}::${field?.key}`)
  const translated = entry?.label?.trim()
  return translated || field?.label || ''
}

/**
 * Resolve a select option's label: translated label if present and
 * non-blank, otherwise the schema's default option label.
 *
 * @param {{value:string,label:string}} option
 * @param {Map} translationIndex - from buildTranslationIndex
 * @param {string} sectionKey
 * @param {string} fieldKey
 * @returns {string}
 */
export function resolveOptionLabel(option, translationIndex, sectionKey, fieldKey) {
  const entry = translationIndex?.get(`${sectionKey}::${fieldKey}`)
  const translated = entry?.option_labels?.[option?.value]
  return (translated && String(translated).trim()) || option?.label || ''
}

/**
 * Coverage summary for a field across a set of active languages — used by
 * the Form Template Builder's "N/M languages" badge.
 *
 * @param {{key:string}} field
 * @param {string} sectionKey
 * @param {Array} translationRows - all rows for the template (any language)
 * @param {Array<{code:string}>} activeLanguages
 * @returns {{translated:number, total:number}}
 */
export function getFieldTranslationCoverage(field, sectionKey, translationRows, activeLanguages) {
  const total = (activeLanguages || []).length
  if (!total) return { translated: 0, total: 0 }

  const covered = new Set(
    (translationRows || [])
      .filter((row) => (
        row.section_key === sectionKey
        && row.field_key === field?.key
        && row.label
        && row.label.trim()
      ))
      .map((row) => row.language_code),
  )

  return { translated: covered.size, total }
}

/** Schema labels are authored in English — exclude from bulk-translation targets. */
export const SOURCE_LANGUAGE_CODES = new Set(['en', 'en-US', 'en-GB'])

/**
 * Languages a PMO admin can translate into (excludes English source variants).
 * @param {Array<{code:string}>} activeLanguages
 */
export function getTranslationTargetLanguages(activeLanguages = []) {
  return activeLanguages.filter((lang) => lang?.code && !SOURCE_LANGUAGE_CODES.has(lang.code))
}

export default {
  buildTranslationIndex,
  resolveFieldLabel,
  resolveOptionLabel,
  getFieldTranslationCoverage,
  SOURCE_LANGUAGE_CODES,
  getTranslationTargetLanguages,
}
