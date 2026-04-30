import { parseShorthandNumber } from '../../services/formCalculations'

export default function FormFieldRenderer({ field, value, onChange }) {
  const common = {
    className: 'w-full rounded border border-gray-700 bg-gray-950 px-3 py-2 text-sm text-gray-100',
    value: value ?? '',
    onChange: (e) => onChange(field.key, e.target.value),
  }

  if (field.type === 'textarea') return <textarea {...common} rows={4} />
  if (field.type === 'date') return <input {...common} type="date" />
  if (field.type === 'number') return <input {...common} type="number" />
  if (field.type === 'select') {
    return (
      <select {...common}>
        <option value="">Select</option>
        {(field.options || []).map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
      </select>
    )
  }

  if (field.type === 'money') {
    return (
      <input
        {...common}
        type="text"
        onBlur={(e) => onChange(field.key, parseShorthandNumber(e.target.value))}
      />
    )
  }

  return <input {...common} type="text" />
}
