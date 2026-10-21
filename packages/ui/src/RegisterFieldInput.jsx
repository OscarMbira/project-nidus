/**
 * RegisterFieldInput — one input for a Local Register field, switching on field_type (moved from
 * the Platform/Simulator LocalRegisterForm copies, v1311). Used for built-in register fields and
 * organisation custom fields alike.
 */
import MultiLineListInput from './MultiLineListInput'
import MultiSelectDropdown from './MultiSelectDropdown'

const INPUT_CLASS =
  'w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm'

export default function RegisterFieldInput({ field, value, onChange }) {
  const type = field.field_type

  if (type === 'boolean') {
    return (
      <label className="inline-flex items-center gap-2">
        <input type="checkbox" checked={!!value} onChange={(e) => onChange(e.target.checked)} aria-label={field.field_label} />
        <span className="text-sm text-gray-700 dark:text-gray-300">Yes</span>
      </label>
    )
  }
  if (type === 'multi_select') {
    return (
      <MultiSelectDropdown
        id={field.field_key}
        value={value}
        options={field.dropdown_options || []}
        onChange={onChange}
        ariaLabel={field.field_label}
      />
    )
  }
  if (type === 'dropdown') {
    return (
      <select value={value ?? ''} onChange={(e) => onChange(e.target.value)} className={INPUT_CLASS} aria-label={field.field_label}>
        <option value="">Select…</option>
        {(field.dropdown_options || []).map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    )
  }
  if (type === 'multi_line') {
    return (
      <MultiLineListInput
        viewModeId={`local-register-field-${field.register_id}-${field.field_key}`}
        id={field.field_key}
        value={typeof value === 'string' ? value : value == null ? '' : String(value)}
        onChange={onChange}
        ariaLabelPrefix={field.field_label}
      />
    )
  }
  if (type === 'long_text') {
    return (
      <textarea value={value ?? ''} onChange={(e) => onChange(e.target.value)} rows={4} className={INPUT_CLASS} aria-label={field.field_label} />
    )
  }
  if (type === 'date') {
    return <input type="date" value={value ?? ''} onChange={(e) => onChange(e.target.value)} className={INPUT_CLASS} aria-label={field.field_label} />
  }
  if (type === 'number' || type === 'currency') {
    return (
      <input
        type="number"
        step={type === 'currency' ? '0.01' : 'any'}
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value === '' ? '' : Number(e.target.value))}
        className={INPUT_CLASS}
        aria-label={field.field_label}
      />
    )
  }
  if (type === 'url') {
    return (
      <input type="url" value={value ?? ''} onChange={(e) => onChange(e.target.value)} placeholder="https://" className={INPUT_CLASS} aria-label={field.field_label} />
    )
  }
  // text, user_picker (plain text entry for v1 — a real user picker is a future extension)
  return <input type="text" value={value ?? ''} onChange={(e) => onChange(e.target.value)} className={INPUT_CLASS} aria-label={field.field_label} />
}
