/**
 * Local Register "Record reference" field type (v1337) — points at records of another register in the
 * same project, e.g. a runbook step → its runbook, its Data Mapping sheet and its Migration Defects.
 *
 * Definition (dropdown_options, one entry): [{ value: '<register_key>', label: '<register label>',
 *   multiple?: boolean, show_fields?: ['<field_key>', …] }] — show_fields are facts of the referenced
 *   record shown under the reference on the record view (e.g. a mapping sheet's expected record count).
 * Value: always an array of { id, label } (label = "display ID – title" at the time of choosing), so
 * lists, exports and documents read it without another lookup.
 */

/** Target register key of a reference field. */
export function refTargetKey(field) {
  return field?.dropdown_options?.[0]?.value || null
}

export function refTargetLabel(field) {
  return field?.dropdown_options?.[0]?.label || 'records'
}

export function refAllowsMultiple(field) {
  return Boolean(field?.dropdown_options?.[0]?.multiple)
}

export function refShowFields(field) {
  const list = field?.dropdown_options?.[0]?.show_fields
  return Array.isArray(list) ? list : []
}

/** "LREG-2026-301 – Mock 2 – static data" (display ID first when the record has one). */
export function recordRefLabel(record) {
  const title = String(record?.title || '').trim()
  return record?.display_id ? `${record.display_id} – ${title}` : title
}

/** Any stored shape → [{ id, label }] (a bare id or array of ids is accepted). */
export function normaliseRefValue(value) {
  if (value === null || value === undefined || value === '') return []
  const list = Array.isArray(value) ? value : [value]
  return list
    .map((item) => (item && typeof item === 'object' ? { id: item.id, label: item.label || item.id } : { id: String(item), label: String(item) }))
    .filter((item) => item.id)
}

/** Records chosen in the picker → stored value. */
export function toRefValue(records) {
  return (records || []).map((r) => ({ id: r.id, label: recordRefLabel(r) }))
}

/** Readable text: labels, one per line. */
export function refValueText(value) {
  return normaliseRefValue(value).map((r) => r.label).join('\n')
}

/** Ids referenced by a value. */
export function refIds(value) {
  return normaliseRefValue(value).map((r) => r.id)
}
