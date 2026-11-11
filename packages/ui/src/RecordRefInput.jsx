/**
 * RecordRefInput — choose records of another register in the same project for a Local Register
 * "Record reference" field (v1337), e.g. a runbook step's runbook, mapping sheet and defects.
 * Single choice uses SelectField (searchable for long lists, rule 69); multiple choice uses
 * MultiSelectDropdown. The value is [{ id, label }] (registerRecordRef.js).
 */
import { useEffect, useState } from 'react'
import { normaliseRefValue, recordRefLabel, refAllowsMultiple, refTargetKey, refTargetLabel } from '@nidus/shared/utils/registerRecordRef'
import SelectField from './SelectField'
import MultiSelectDropdown from './MultiSelectDropdown'

/**
 * @param {object} props
 * @param {object} props.field                     register field (field_type 'record_ref')
 * @param {*} props.value                          stored value
 * @param {(next: Array<{id: string, label: string}>) => void} props.onChange
 * @param {(registerKey: string) => Promise<object[]>} [props.loadOptions]  records of the target register in this project
 * @param {boolean} [props.disabled]
 */
export default function RecordRefInput({ field, value, onChange, loadOptions, disabled = false }) {
  const registerKey = refTargetKey(field)
  const multiple = refAllowsMultiple(field)
  const [state, setState] = useState({ key: null, records: [], error: null })

  useEffect(() => {
    if (!registerKey || !loadOptions) return undefined
    let cancelled = false
    loadOptions(registerKey)
      .then((records) => { if (!cancelled) setState({ key: registerKey, records: records || [], error: null }) })
      .catch((err) => { if (!cancelled) setState({ key: registerKey, records: [], error: err?.message || 'Could not load records' }) })
    return () => { cancelled = true }
  }, [registerKey, loadOptions])

  const chosen = normaliseRefValue(value)
  const loaded = state.key === registerKey ? state.records : []
  // Keep already-chosen records selectable even if they are not in the loaded list.
  const options = [
    ...loaded.map((r) => ({ value: r.id, label: recordRefLabel(r) })),
    ...chosen.filter((c) => !loaded.some((r) => r.id === c.id)).map((c) => ({ value: c.id, label: c.label })),
  ]
  const toValue = (ids) => ids.map((id) => ({ id, label: options.find((o) => o.value === id)?.label || id }))
  const loading = Boolean(registerKey && loadOptions) && state.key !== registerKey

  return (
    <div className="space-y-1">
      {multiple ? (
        <MultiSelectDropdown
          id={field.field_key}
          value={chosen.map((c) => c.id)}
          options={options}
          onChange={(ids) => onChange(toValue(ids))}
          placeholder={loading ? 'Loading…' : `Add from ${refTargetLabel(field)}…`}
          ariaLabel={field.field_label}
          disabled={disabled}
        />
      ) : (
        <SelectField
          id={field.field_key}
          options={options}
          value={chosen[0]?.id || ''}
          onChange={(id) => onChange(id ? toValue([String(id)]) : [])}
          placeholder={loading ? 'Loading…' : `Select from ${refTargetLabel(field)}…`}
          searchPlaceholder={`Search ${refTargetLabel(field)}…`}
          aria-label={field.field_label}
          disabled={disabled}
        />
      )}
      {state.error ? <p className="text-xs text-red-600 dark:text-red-400">{state.error}</p> : null}
      {!loading && !state.error && options.length === 0 ? (
        <p className="text-xs text-gray-500 dark:text-gray-400">No {refTargetLabel(field)} records in this project yet.</p>
      ) : null}
    </div>
  )
}
