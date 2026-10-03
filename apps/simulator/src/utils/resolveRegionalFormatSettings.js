/**
 * Merge organisation defaults + optional project overrides into a resolved pack (v1062).
 * Local custom fields (v1065) via resolveLocalFieldValues / buildLocalFieldProjectPayload.
 */

import {
  REGIONAL_FORMAT_DEFAULTS,
  REGIONAL_FORMAT_FIELD_KEYS,
} from './regionalFormatConstants.js'

/**
 * @param {object|null|undefined} orgRow
 * @param {object|null|undefined} projectRow — null columns inherit
 * @returns {typeof REGIONAL_FORMAT_DEFAULTS & { overrides: Record<string, boolean> }}
 */
export function resolveRegionalFormatSettings(orgRow, projectRow) {
  const base = { ...REGIONAL_FORMAT_DEFAULTS }
  if (orgRow && typeof orgRow === 'object') {
    for (const key of REGIONAL_FORMAT_FIELD_KEYS) {
      if (orgRow[key] != null && orgRow[key] !== '') base[key] = orgRow[key]
    }
  }
  const overrides = {}
  if (projectRow && typeof projectRow === 'object') {
    for (const key of REGIONAL_FORMAT_FIELD_KEYS) {
      const v = projectRow[key]
      if (v != null && v !== '') {
        base[key] = v
        overrides[key] = true
      } else {
        overrides[key] = false
      }
    }
  } else {
    for (const key of REGIONAL_FORMAT_FIELD_KEYS) overrides[key] = false
  }
  return { ...base, overrides }
}

/**
 * Build a project upsert payload from override map + values.
 * @param {Record<string, boolean>} overrideFlags
 * @param {object} values — full form values (resolved or draft)
 */
export function buildProjectOverridePayload(overrideFlags, values) {
  const payload = {}
  for (const key of REGIONAL_FORMAT_FIELD_KEYS) {
    payload[key] = overrideFlags?.[key] ? values?.[key] ?? null : null
  }
  return payload
}

/**
 * Coerce a stored default_value string into a typed JS value.
 * @param {'text'|'number'|'boolean'|'date'} valueType
 * @param {string|null|undefined} raw
 */
export function parseLocalFieldDefault(valueType, raw) {
  if (raw == null || raw === '') {
    if (valueType === 'boolean') return false
    if (valueType === 'number') return null
    return ''
  }
  if (valueType === 'number') {
    const n = Number(raw)
    return Number.isFinite(n) ? n : null
  }
  if (valueType === 'boolean') {
    const s = String(raw).trim().toLowerCase()
    return s === 'true' || s === '1' || s === 'yes'
  }
  return String(raw)
}

/**
 * Resolve local field values for display/consumers.
 * @param {Array<{id:string, project_id?:string|null, value_type:string, default_value?:string|null}>} definitions
 * @param {Record<string, any>|null|undefined} orgValues
 * @param {Record<string, any>|null|undefined} projectValues
 * @param {Record<string, boolean>|null|undefined} projectOverrideFlags — org-defined only
 * @returns {{ values: Record<string, any>, overrides: Record<string, boolean> }}
 */
export function resolveLocalFieldValues(definitions, orgValues, projectValues, projectOverrideFlags) {
  const values = {}
  const overrides = {}
  const orgMap = orgValues && typeof orgValues === 'object' ? orgValues : {}
  const projMap = projectValues && typeof projectValues === 'object' ? projectValues : {}
  const flagMap = projectOverrideFlags && typeof projectOverrideFlags === 'object' ? projectOverrideFlags : {}

  for (const def of definitions || []) {
    if (!def?.id) continue
    const id = def.id
    const fallback = parseLocalFieldDefault(def.value_type, def.default_value)
    const isProjectOnly = !!def.project_id

    if (isProjectOnly) {
      values[id] = Object.prototype.hasOwnProperty.call(projMap, id) ? projMap[id] : fallback
      overrides[id] = true
      continue
    }

    const orgVal = Object.prototype.hasOwnProperty.call(orgMap, id) ? orgMap[id] : fallback
    const overridden = !!flagMap[id]
    overrides[id] = overridden
    values[id] = overridden && Object.prototype.hasOwnProperty.call(projMap, id)
      ? projMap[id]
      : orgVal
  }

  return { values, overrides }
}

/**
 * Build project JSONB columns for local fields.
 * @param {Array<{id:string, project_id?:string|null}>} definitions
 * @param {Record<string, boolean>} overrideFlags
 * @param {Record<string, any>} values
 */
export function buildLocalFieldProjectPayload(definitions, overrideFlags, values) {
  const local_field_values = {}
  const local_field_overrides = {}
  for (const def of definitions || []) {
    if (!def?.id) continue
    const id = def.id
    if (def.project_id) {
      local_field_values[id] = values?.[id] ?? null
      continue
    }
    if (overrideFlags?.[id]) {
      local_field_overrides[id] = true
      local_field_values[id] = values?.[id] ?? null
    }
  }
  return { local_field_values, local_field_overrides }
}

/**
 * Slugify a label into a field_key candidate (lowercase snake).
 */
export function slugifyLocalFieldKey(label) {
  const base = String(label || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 64)
  if (!base) return 'field'
  if (/^[a-z]/.test(base)) return base
  return `f_${base}`.slice(0, 64)
}
