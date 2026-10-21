/**
 * Local Register Engine — split a register's field definitions into tabs (v1297).
 * Fields with no field_group belong to the fixed Details tab (alongside Title / Description /
 * Status); every distinct field_group becomes its own tab, ordered by where its first field
 * appears. Input fields are expected already sorted by display_order (getRegisterDefinition).
 */

export const DETAILS_TAB = 'details'
export const AUDIT_TAB = 'audit'
/** Organisation custom fields (v1311) — always the tab just before Audit details. */
export const CUSTOM_FIELDS_TAB = 'custom-fields'

/**
 * @param {Array<{ field_group?: string | null }>} fields
 * @returns {{ detailsFields: object[], groups: { value: string, label: string, fields: object[] }[] }}
 */
export function groupRegisterFields(fields) {
  const detailsFields = []
  const groups = new Map()
  for (const field of fields || []) {
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
 * Fields, then Audit details.
 * @param {{ value: string, label: string }[]} groups
 * @param {{ includeCustomFields?: boolean }} [options]
 */
export function buildRegisterTabs(groups, { includeCustomFields = false } = {}) {
  return [
    { value: DETAILS_TAB, label: 'Details' },
    ...groups.map(({ value, label }) => ({ value, label })),
    ...(includeCustomFields ? [{ value: CUSTOM_FIELDS_TAB, label: 'Custom Fields' }] : []),
    { value: AUDIT_TAB, label: 'Audit details' },
  ]
}
