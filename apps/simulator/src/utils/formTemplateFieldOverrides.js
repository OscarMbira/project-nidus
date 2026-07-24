/**
 * Per-organisation form template field override helpers.
 * No override row = field enabled (default-on), required inherits the master schema's own flag.
 */

/** @typedef {{ section_key: string, field_key: string, is_enabled: boolean, is_required: boolean|null }} FieldOverrideRow */
/** @typedef {{ enabled: boolean, required: boolean|null }} FieldOverrideEntry */
/** @typedef {{ section_key: string, field_key: string, field_definition: object }} FieldAdditionRow */

/**
 * Build a lookup map from override rows.
 * @param {FieldOverrideRow[]} rows
 * @returns {Map<string, FieldOverrideEntry>}
 */
export function buildFieldOverrideMap(rows = []) {
  const map = new Map()
  for (const row of rows) {
    if (!row?.section_key || !row?.field_key) continue
    map.set(`${row.section_key}::${row.field_key}`, {
      enabled: row.is_enabled !== false,
      required: row.is_required === true || row.is_required === false ? row.is_required : null,
    })
  }
  return map
}

/**
 * @param {Map<string, FieldOverrideEntry>} overrideMap
 * @param {string} sectionKey
 * @param {string} fieldKey
 * @returns {boolean}
 */
export function isFieldEnabledForOrg(overrideMap, sectionKey, fieldKey) {
  const entry = overrideMap?.get(`${sectionKey}::${fieldKey}`)
  if (!entry) return true
  return entry.enabled !== false
}

/**
 * Effective required flag for a field: an explicit org override wins; otherwise the master
 * schema's own field.required (baseRequired) applies.
 * @param {Map<string, FieldOverrideEntry>} overrideMap
 * @param {string} sectionKey
 * @param {string} fieldKey
 * @param {boolean} baseRequired
 * @returns {boolean}
 */
export function isFieldRequiredForOrg(overrideMap, sectionKey, fieldKey, baseRequired = false) {
  const entry = overrideMap?.get(`${sectionKey}::${fieldKey}`)
  if (!entry || entry.required === null || entry.required === undefined) return Boolean(baseRequired)
  return entry.required
}

/**
 * Filter + merge template schema sections/fields using an org override map, and append the
 * organisation's own locally-added fields (tagged `is_local: true`) to their section, after the
 * master's own fields. Disabled fields (master or local) are dropped; every surviving field's
 * `required` reflects the effective (override-or-inherit) flag.
 * @param {object} schema
 * @param {Map<string, FieldOverrideEntry>} overrideMap
 * @param {FieldAdditionRow[]} additions
 * @returns {object}
 */
export function applySchemaFieldOverrides(schema, overrideMap, additions = []) {
  if (!schema) return schema

  const additionsBySection = new Map()
  for (const addition of additions) {
    if (!addition?.section_key || !addition?.field_definition?.key) continue
    const list = additionsBySection.get(addition.section_key) || []
    list.push({ ...addition.field_definition, is_local: true })
    additionsBySection.set(addition.section_key, list)
  }

  const sections = (schema.sections || []).map((section) => {
    const sectionKey = section.key
    const localFields = additionsBySection.get(sectionKey) || []
    const fields = [...(section.fields || []), ...localFields]
      .filter((field) => isFieldEnabledForOrg(overrideMap, sectionKey, field.key))
      .map((field) => ({
        ...field,
        required: isFieldRequiredForOrg(overrideMap, sectionKey, field.key, field.required),
      }))
    return { ...section, fields }
  }).filter((section) => (section.fields || []).length > 0 || (section.tables || []).length > 0)

  return { ...schema, sections }
}

/**
 * Merge a chain of override maps (root tier first, e.g. Org, Portfolio, Programme, Project —
 * whichever tiers actually resolved for this entity, per resolveEntityPolicyChain) into one
 * effective per-field {enabled, required} map, applying the one-way ratchet (decision 11):
 * a descendant tier can only disable a field while the required state resolved so far is
 * false, and can never un-require a field an ancestor already required. Re-enabling a field an
 * ancestor disabled is always allowed — only `required` tightening is one-way.
 * @param {Map<string, FieldOverrideEntry>[]} overrideMapsRootToLeaf
 * @returns {Map<string, FieldOverrideEntry>}
 */
export function mergeOverrideChain(overrideMapsRootToLeaf = []) {
  const allKeys = new Set()
  for (const map of overrideMapsRootToLeaf) {
    for (const key of map.keys()) allKeys.add(key)
  }

  const merged = new Map()
  for (const key of allKeys) {
    let enabled = true
    let required = null
    for (const map of overrideMapsRootToLeaf) {
      const entry = map.get(key)
      if (!entry) continue
      if (entry.required === true) {
        required = true
      } else if (entry.required === false && required !== true) {
        required = false
      }
      if (entry.enabled === false) {
        if (required !== true) enabled = false
      } else if (entry.enabled === true) {
        enabled = true
      }
    }
    merged.set(key, { enabled, required })
  }
  return merged
}

/**
 * Tiered variant of applySchemaFieldOverrides: takes a root-to-leaf chain of override maps and
 * of addition rows (each tagged with its owning scope) instead of a single org-wide map/list.
 * Additions are appended in chain order (ancestor tiers' fields before descendant tiers' own),
 * each carrying `owner_scope_entity_type`/`owner_scope_entity_id` so the UI can compare "whose
 * field is this" against "which tier am I" to decide delete-vs-disable-only (decision 13).
 * @param {object} schema
 * @param {Map<string, FieldOverrideEntry>[]} overrideMapsRootToLeaf
 * @param {(FieldAdditionRow & { scope_entity_type: string, scope_entity_id: string })[]} additionsRootToLeaf
 * @returns {object}
 */
export function applyTieredSchemaFieldOverrides(schema, overrideMapsRootToLeaf = [], additionsRootToLeaf = []) {
  if (!schema) return schema
  const mergedMap = mergeOverrideChain(overrideMapsRootToLeaf)

  const additionsBySection = new Map()
  for (const addition of additionsRootToLeaf) {
    if (!addition?.section_key || !addition?.field_definition?.key) continue
    const list = additionsBySection.get(addition.section_key) || []
    list.push({
      ...addition.field_definition,
      is_local: true,
      owner_scope_entity_type: addition.scope_entity_type === 'account' ? null : addition.scope_entity_type,
      owner_scope_entity_id: addition.scope_entity_type === 'account' ? null : addition.scope_entity_id,
    })
    additionsBySection.set(addition.section_key, list)
  }

  const sections = (schema.sections || []).map((section) => {
    const sectionKey = section.key
    const localFields = additionsBySection.get(sectionKey) || []
    const fields = [...(section.fields || []), ...localFields]
      .filter((field) => {
        const entry = mergedMap.get(`${sectionKey}::${field.key}`)
        return !entry || entry.enabled !== false
      })
      .map((field) => {
        const entry = mergedMap.get(`${sectionKey}::${field.key}`)
        const required = entry && (entry.required === true || entry.required === false)
          ? entry.required
          : Boolean(field.required)
        return { ...field, required }
      })
    return { ...section, fields }
  }).filter((section) => (section.fields || []).length > 0 || (section.tables || []).length > 0)

  return { ...schema, sections }
}

/**
 * Flat list of catalog fields for availability/required toggles.
 * @param {object} schema
 * @returns {{ sectionKey: string, sectionTitle: string, fieldKey: string, fieldLabel: string, baseRequired: boolean }[]}
 */
export function listCatalogFields(schema) {
  const out = []
  for (const section of schema?.sections || []) {
    for (const field of section.fields || []) {
      out.push({
        sectionKey: section.key,
        sectionTitle: section.title || section.key,
        fieldKey: field.key,
        fieldLabel: field.label || field.key,
        baseRequired: Boolean(field.required),
      })
    }
  }
  return out
}
