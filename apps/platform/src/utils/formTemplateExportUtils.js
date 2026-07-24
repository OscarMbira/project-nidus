/**
 * Form-template export shaping (Platform + Simulator).
 * Merges org Default Content (guidance_text / default_value) over schema help/sample.
 */

import {
  buildFieldDefaultMap,
  buildGuidanceMap,
  fieldDefaultKey,
  isEmptyDefaultValue,
} from './formTemplateFieldDefaults.js'

/** Max length for Plain Template "Example:" lines. */
export const EXPORT_EXAMPLE_MAX_LEN = 180

/** Ruled blank line for Plain Template fillable exports. */
export const PLAIN_TEMPLATE_BLANK = '_______________'

/**
 * @param {unknown} text
 * @param {number} [maxLen]
 * @returns {string}
 */
export function truncateExportExample(text, maxLen = EXPORT_EXAMPLE_MAX_LEN) {
  const s = String(text ?? '').replace(/\s+/g, ' ').trim()
  if (!s) return ''
  if (s.length <= maxLen) return s
  return `${s.slice(0, Math.max(0, maxLen - 1)).trimEnd()}…`
}

/**
 * Flatten a default_value for Example / sample record use.
 * @param {unknown} value
 * @returns {string}
 */
export function stringifySampleValue(value) {
  if (value == null) return ''
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  if (Array.isArray(value)) return value.map((v) => stringifySampleValue(v)).filter(Boolean).join('\n')
  try {
    return JSON.stringify(value)
  } catch {
    return String(value)
  }
}

/**
 * description = org.guidance_text (if set) OR schema.field.help
 * sample for Plain Example = org.default_value OR schema.field.sample
 *
 * @param {object} schema
 * @param {import('./formTemplateFieldDefaults.js').FieldDefaultRow[]} [defaultRows]
 * @returns {object}
 */
export function mergeSchemaGuidanceForExport(schema = { sections: [] }, defaultRows = []) {
  const guidance = buildGuidanceMap(defaultRows)
  const samples = buildFieldDefaultMap(defaultRows)
  return {
    ...schema,
    sections: (schema?.sections || []).map((section) => ({
      ...section,
      fields: (section.fields || []).map((field) => {
        const key = fieldDefaultKey(section.key, field.key)
        const orgHelp = guidance.get(key)
        const help = String(orgHelp || field.help || field.guidance || '').trim()
        const out = { ...field }
        if (help) out.help = help
        else delete out.help

        if (samples.has(key)) {
          out.sample = stringifySampleValue(samples.get(key))
        } else if (field.sample != null && String(field.sample).trim() !== '') {
          out.sample = String(field.sample)
        }
        return out
      }),
    })),
  }
}

/**
 * Map schema into exportRecordTo* sections. Optional Example from sample when includeExamples.
 * @param {object|null|undefined} schema
 * @param {{ includeExamples?: boolean }} [options]
 */
export function schemaToExportSections(schema, options = {}) {
  const includeExamples = Boolean(options.includeExamples)
  const sections = Array.isArray(schema?.sections) ? schema.sections : []
  return sections
    .map((section, sIdx) => ({
      title: String(section?.title || section?.key || `Section ${sIdx + 1}`).trim() || `Section ${sIdx + 1}`,
      fields: (Array.isArray(section?.fields) ? section.fields : [])
        .filter((f) => f && (f.key || f.label))
        .map((f, fIdx) => {
          const help = String(f.help || f.guidance || '').trim()
          const example = includeExamples ? truncateExportExample(f.sample) : ''
          const out = {
            key: String(f.key || `field_${fIdx + 1}`),
            label: String(f.label || f.key || `Field ${fIdx + 1}`),
          }
          if (help) out.help = help
          if (example) out.example = example
          return out
        }),
    }))
    .filter((s) => s.fields.length > 0)
}

/**
 * Merge org defaults then shape for export.
 * @param {object} schema
 * @param {import('./formTemplateFieldDefaults.js').FieldDefaultRow[]} [defaultRows]
 * @param {{ includeExamples?: boolean }} [options]
 */
export function buildExportSections(schema, defaultRows = [], options = {}) {
  const merged = mergeSchemaGuidanceForExport(schema, defaultRows)
  return schemaToExportSections(merged, options)
}

/**
 * @param {{ help?: string, example?: string }} field
 * @returns {string[]}
 */
export function getFieldGuidanceLines(field) {
  const lines = []
  const help = String(field?.help || '').trim()
  const example = String(field?.example || '').trim()
  if (help) lines.push(help)
  if (example) lines.push(`Example: ${example}`)
  return lines
}

/**
 * @param {{ help?: string, example?: string }} field
 * @param {unknown} value
 * @param {(val: unknown, blank: string) => string} formatValue
 * @param {string} [blankPlaceholder]
 * @returns {string}
 */
export function composeGuidedExportValue(field, value, formatValue, blankPlaceholder = '—') {
  const display = typeof formatValue === 'function'
    ? formatValue(value, blankPlaceholder)
    : (value == null || value === '' ? blankPlaceholder : String(value))
  const lines = getFieldGuidanceLines(field)
  if (!lines.length) return display
  return `${lines.join('\n')}\n\n${display}`
}

export function buildBlankRecord(schema) {
  const record = {}
  for (const section of schema?.sections || []) {
    for (const field of section.fields || []) {
      if (!field?.key) continue
      record[field.key] = ''
    }
  }
  return record
}

/**
 * Flatten sample values: org default_value preferred, else schema.sample.
 * @param {object} schema - preferably already merged via mergeSchemaGuidanceForExport
 */
export function buildSampleRecord(schema) {
  const record = {}
  for (const section of schema?.sections || []) {
    for (const field of section.fields || []) {
      if (!field?.key) continue
      record[field.key] = field.sample != null ? stringifySampleValue(field.sample) : ''
    }
  }
  return record
}

export function buildFormTemplateExportFilename({ templateCode, templateName } = {}) {
  const code = String(templateCode || 'FORM').trim().replace(/[^a-zA-Z0-9_-]+/g, '_') || 'FORM'
  const slug = String(templateName || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
    .slice(0, 64) || 'form_template'
  return `${code}_${slug}`
}
