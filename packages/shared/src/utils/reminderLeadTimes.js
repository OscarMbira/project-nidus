/**
 * v1352 Slice 1 (1.3a, D7) — pure helpers for the Reminder Lead Times page (Platform + Simulator).
 * Items come from reminder_lead_times_get (public or sim): { record_type, label, default_lead_days, lead_days }.
 * In the form each type holds a string: '' = use the default, otherwise whole days 0–365.
 */

export const LEAD_DAYS_MAX = 365

/** Form state { [record_type]: string } from the loaded items. */
export function leadTimeFormFromItems(items = []) {
  const form = {}
  for (const item of items || []) {
    if (!item?.record_type) continue
    form[item.record_type] = item.lead_days === null || item.lead_days === undefined ? '' : String(item.lead_days)
  }
  return form
}

/** Error text for one value, or null when valid ('' is valid: back to the default). */
export function leadDaysError(value) {
  const v = String(value ?? '').trim()
  if (v === '') return null
  if (!/^\d+$/.test(v)) return 'Enter whole days, or leave empty for the default'
  if (Number(v) > LEAD_DAYS_MAX) return `Enter ${LEAD_DAYS_MAX} days or fewer`
  return null
}

/** Only the changed types, as the save RPC expects: [{ record_type, lead_days: number | null }]. */
export function leadTimeChanges(items = [], form = {}) {
  const saved = leadTimeFormFromItems(items)
  return Object.keys(form)
    .filter((type) => Object.prototype.hasOwnProperty.call(saved, type))
    .filter((type) => String(form[type] ?? '').trim() !== saved[type])
    .map((type) => {
      const v = String(form[type] ?? '').trim()
      return { record_type: type, lead_days: v === '' ? null : Number(v) }
    })
}

/** Lead time in force for one item: the override, else the default. */
export function effectiveLeadDays(item, formValue) {
  const v = String(formValue ?? '').trim()
  if (v !== '' && leadDaysError(v) === null) return Number(v)
  return Number(item?.default_lead_days ?? 0)
}

/** How many types use their own (non-default) lead time. */
export function countOverrides(items = []) {
  return (items || []).filter((i) => i?.lead_days !== null && i?.lead_days !== undefined).length
}
