import { parseShorthandNumber } from '../../services/formCalculations'
import { formatWithSeparators } from '@nidus/shared/utils/amountShorthand'
import { formatLocaleNumber } from '@nidus/shared/utils/localeFormat'

export default function FormFieldRenderer({ field, value, onChange, resolveOptionLabel, languageCode }) {
  const common = {
    className: 'w-full rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500',
    value: value ?? '',
    onChange: (e) => onChange(field.key, e.target.value),
  }

  if (field.type === 'textarea') {
    return (
      <textarea
        {...common}
        rows={4}
        className={`${common.className} resize-none`}
      />
    )
  }
  if (field.type === 'date') return <input {...common} type="date" />

  if (field.type === 'number') {
    const preview = formatLocaleNumber(value, languageCode)
    return (
      <div className="space-y-1">
        <input {...common} type="number" />
        {preview && <p className="text-xs text-gray-500">{preview}</p>}
      </div>
    )
  }

  if (field.type === 'select') {
    return (
      <select {...common}>
        <option value="">Select</option>
        {(field.options || []).map((opt) => (
          <option key={opt.value} value={opt.value}>
            {resolveOptionLabel ? resolveOptionLabel(opt) : opt.label}
          </option>
        ))}
      </select>
    )
  }

  if (field.type === 'money') {
    const numericValue = Number(value)
    const preview = value !== '' && value !== null && !Number.isNaN(numericValue)
      ? formatWithSeparators(numericValue, { locale: languageCode || 'en-US' })
      : ''
    return (
      <div className="space-y-1">
        <input
          {...common}
          type="text"
          onBlur={(e) => onChange(field.key, parseShorthandNumber(e.target.value))}
        />
        {preview && <p className="text-xs text-gray-500">{preview}</p>}
      </div>
    )
  }

  return <input {...common} type="text" />
}
