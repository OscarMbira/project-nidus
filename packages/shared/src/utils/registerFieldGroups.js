/**
 * Local Register Engine — split a register's field definitions into tabs (v1297).
 * Fields with no field_group belong to the fixed Details tab (alongside Title / Description /
 * Status); every distinct field_group becomes its own tab, ordered by where its first field
 * appears. Input fields are expected already sorted by display_order (getRegisterDefinition).
 *
 * Conditional fields (v1346): a field may carry visible_when = { field: '<key>', in: ['<value>', …] }.
 * Pass the record's values and such a field is left out while the controlling field's value (or,
 * for a multi-select, any of its values) is not in the list — and a tab with no fields left is
 * dropped. Stored values of hidden fields are kept, just not shown.
 */

export const DETAILS_TAB = 'details'
export const AUDIT_TAB = 'audit'
/** Organisation custom fields (v1311) — always the tab just before Audit details. */
export const CUSTOM_FIELDS_TAB = 'custom-fields'
/** Document registers (v1318): sign-off chain and annexure attachments, before Audit details. */
export const SIGNOFF_TAB = 'signoff'
export const ATTACHMENTS_TAB = 'attachments'

/**
 * @param {{ visible_when?: { field?: string, in?: unknown[] } | null }} field
 * @param {Record<string, unknown>} values  record field_values
 */
export function isFieldVisible(field, values) {
  const rule = field?.visible_when
  if (!rule || !rule.field || !Array.isArray(rule.in)) return true
  const value = values?.[rule.field]
  const selected = Array.isArray(value) ? value : [value]
  return selected.some((v) => v !== undefined && v !== null && v !== '' && rule.in.includes(v))
}

/**
 * Industry-only fields (v1342): a field may carry visible_when = { project_industry: ['<industry
 * category name>', …] }. It is kept only when the record's project has one of those industries
 * (names compare case-insensitively). With no project industries known, such fields are left out.
 * Apply once to the register definition where it is loaded (form, record page), so the tabs,
 * exports, document and placeholders built from that definition all follow it. Stored values of
 * left-out fields are kept, just not shown.
 * @param {object[]} fields
 * @param {string[] | null | undefined} projectIndustryNames
 */
export function filterFieldsForProjectIndustries(fields, projectIndustryNames) {
  const have = new Set((projectIndustryNames || []).map((n) => String(n || '').trim().toLowerCase()).filter(Boolean))
  return (fields || []).filter((field) => {
    const wanted = field?.visible_when?.project_industry
    if (!Array.isArray(wanted) || wanted.length === 0) return true
    return wanted.some((n) => have.has(String(n || '').trim().toLowerCase()))
  })
}

/** The register with its industry-only fields filtered for the project (see above). */
export function registerForProjectIndustries(register, projectIndustryNames) {
  if (!register || !Array.isArray(register.fields)) return register
  const fields = filterFieldsForProjectIndustries(register.fields, projectIndustryNames)
  return fields.length === register.fields.length ? register : { ...register, fields }
}

/**
 * @param {Array<{ field_group?: string | null }>} fields
 * @param {Record<string, unknown>} [values]  record field_values — when given, conditional fields are applied
 * @returns {{ detailsFields: object[], groups: { value: string, label: string, fields: object[] }[] }}
 */
export function groupRegisterFields(fields, values) {
  const detailsFields = []
  const groups = new Map()
  for (const field of fields || []) {
    if (values && !isFieldVisible(field, values)) continue
    const label = (field.field_group || '').trim()
    if (!label) {
      detailsFields.push(field)
      continue
    }
    const value = `group-${label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`
    if (!groups.has(value)) groups.set(value, { value, label, fields: [] })
    groups.get(value).fields.push(field)
  }
  return { detailsFields, groups: [...groups.values()] }
}

/**
 * Tab list for DetailAuditTabList's `tabs` prop: Details, one per group, optionally Custom
 * Fields, then (document registers, v1318) Attachments and Sign-off, then Audit details.
 * @param {{ value: string, label: string }[]} groups
 * @param {{ includeCustomFields?: boolean, includeDocumentTabs?: boolean }} [options]
 */
export function buildRegisterTabs(groups, { includeCustomFields = false, includeDocumentTabs = false } = {}) {
  return [
    { value: DETAILS_TAB, label: 'Details' },
    ...groups.map(({ value, label }) => ({ value, label })),
    ...(includeCustomFields ? [{ value: CUSTOM_FIELDS_TAB, label: 'Custom Fields' }] : []),
    ...(includeDocumentTabs
      ? [{ value: ATTACHMENTS_TAB, label: 'Attachments' }, { value: SIGNOFF_TAB, label: 'Sign-off' }]
      : []),
    { value: AUDIT_TAB, label: 'Audit details' },
  ]
}
