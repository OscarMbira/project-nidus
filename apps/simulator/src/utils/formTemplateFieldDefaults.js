/**
 * Per-organisation form template default-value helpers.
 * - default_value = sample / pre-fill for new instances
 * - guidance_text = instructional help (does not pre-fill by itself)
 * No default row = no pre-filled value / no guidance.
 */

/** @typedef {{ section_key: string, field_key: string, default_value?: unknown, guidance_text?: string | null }} FieldDefaultRow */

export function fieldDefaultKey(sectionKey, fieldKey) {
  return `${sectionKey}::${fieldKey}`
}

export function isEmptyDefaultValue(value) {
  if (value == null) return true
  if (typeof value === 'string') return value.trim() === ''
  if (Array.isArray(value)) return value.length === 0
  return false
}

export function isEmptyGuidanceText(value) {
  return value == null || String(value).trim() === ''
}

/**
 * Build a lookup map from default rows (sample values only).
 * @param {FieldDefaultRow[]} rows
 * @returns {Map<string, unknown>}
 */
export function buildFieldDefaultMap(rows = []) {
  const map = new Map()
  for (const row of rows) {
    if (!row?.section_key || !row?.field_key || isEmptyDefaultValue(row.default_value)) continue
    map.set(fieldDefaultKey(row.section_key, row.field_key), row.default_value)
  }
  return map
}

/**
 * Build a lookup map of guidance text by section::field.
 * @param {FieldDefaultRow[]} rows
 * @returns {Map<string, string>}
 */
export function buildGuidanceMap(rows = []) {
  const map = new Map()
  for (const row of rows) {
    if (!row?.section_key || !row?.field_key || isEmptyGuidanceText(row.guidance_text)) continue
    map.set(fieldDefaultKey(row.section_key, row.field_key), String(row.guidance_text).trim())
  }
  return map
}

/**
 * Build form values from default rows for fields present in the supplied schema.
 * Disabled fields should already be filtered out of the schema before calling.
 *
 * When `fallbackToSchemaSample` is true (default), fields without an org-level
 * default fall back to `field.sample` from the template schema (Admin-curated).
 *
 * @param {FieldDefaultRow[]} rows
 * @param {object} schema
 * @param {{ fallbackToSchemaSample?: boolean }} [options]
 * @returns {Record<string, unknown>}
 */
export function buildDefaultValuesMap(rows = [], schema = { sections: [] }, { fallbackToSchemaSample = true } = {}) {
  const defaults = buildFieldDefaultMap(rows)
  const values = {}

  for (const section of schema?.sections || []) {
    for (const field of section.fields || []) {
      const key = fieldDefaultKey(section.key, field.key)
      if (defaults.has(key)) {
        values[field.key] = defaults.get(key)
        continue
      }
      if (fallbackToSchemaSample && !isEmptyDefaultValue(field?.sample)) {
        values[field.key] = field.sample
      }
    }
  }

  return values
}

/**
 * Build guidance values map keyed by field.key for fields in the schema.
 * Falls back to `field.help` when no org-level guidance_text exists (default on).
 *
 * @param {FieldDefaultRow[]} rows
 * @param {object} schema
 * @param {{ fallbackToSchemaHelp?: boolean }} [options]
 * @returns {Record<string, string>}
 */
export function buildGuidanceValuesMap(rows = [], schema = { sections: [] }, { fallbackToSchemaHelp = true } = {}) {
  const guidance = buildGuidanceMap(rows)
  const values = {}

  for (const section of schema?.sections || []) {
    for (const field of section.fields || []) {
      const key = fieldDefaultKey(section.key, field.key)
      if (guidance.has(key)) {
        values[field.key] = guidance.get(key)
        continue
      }
      if (fallbackToSchemaHelp && !isEmptyGuidanceText(field?.help)) {
        values[field.key] = String(field.help).trim()
      }
    }
  }

  return values
}

/**
 * Attach guidance onto schema fields as `help`.
 * Org guidance_text wins; otherwise keep existing field.help (schema sample path).
 *
 * @param {object} schema
 * @param {FieldDefaultRow[]} rows
 * @returns {object}
 */
export function applyGuidanceToSchema(schema = { sections: [] }, rows = []) {
  const guidance = buildGuidanceMap(rows)
  return {
    ...schema,
    sections: (schema?.sections || []).map((section) => ({
      ...section,
      fields: (section.fields || []).map((field) => {
        const fromOrg = guidance.get(fieldDefaultKey(section.key, field.key))
        if (fromOrg) return { ...field, help: fromOrg }
        return field
      }),
    })),
  }
}

/**
 * Flatten current values to default rows for enabled catalog fields only.
 * @param {Record<string, unknown>} values
 * @param {object} schema
 * @returns {{ sectionKey: string, fieldKey: string, value: unknown }[]}
 */
export function listDefaultEntriesFromValues(values = {}, schema = { sections: [] }) {
  const entries = []
  for (const section of schema?.sections || []) {
    for (const field of section.fields || []) {
      const value = values[field.key]
      if (isEmptyDefaultValue(value)) continue
      entries.push({ sectionKey: section.key, fieldKey: field.key, value })
    }
  }
  return entries
}

/**
 * List upsert/clear operations for sample + guidance per enabled field.
 * @param {Record<string, unknown>} sampleValues
 * @param {Record<string, string>} guidanceValues
 * @param {object} schema
 * @returns {{ sectionKey: string, fieldKey: string, value: unknown | null, guidanceText: string | null, clear: boolean }[]}
 */
export function listDefaultContentEntries(sampleValues = {}, guidanceValues = {}, schema = { sections: [] }) {
  const entries = []
  for (const section of schema?.sections || []) {
    for (const field of section.fields || []) {
      const value = sampleValues[field.key]
      const guidanceText = guidanceValues[field.key]
      const emptySample = isEmptyDefaultValue(value)
      const emptyGuidance = isEmptyGuidanceText(guidanceText)
      entries.push({
        sectionKey: section.key,
        fieldKey: field.key,
        value: emptySample ? null : value,
        guidanceText: emptyGuidance ? null : String(guidanceText).trim(),
        clear: emptySample && emptyGuidance,
      })
    }
  }
  return entries
}
