/**
 * MultiSelectDropdown — pick several options from a fixed list (v1304, Local Register
 * 'multi_select' fields). Value is an array of option values, kept in the options' own order;
 * picked options show as removable chips above a dropdown of the ones not yet picked.
 */
import { X } from 'lucide-react'

export default function MultiSelectDropdown({
  id,
  value,
  options = [],
  onChange,
  placeholder = 'Add…',
  ariaLabel,
  disabled = false,
}) {
  const selected = Array.isArray(value) ? value : []
  const labelFor = (v) => options.find((o) => o.value === v)?.label || v
  const remaining = options.filter((o) => !selected.includes(o.value))
  const setSelected = (next) => onChange(options.map((o) => o.value).filter((v) => next.includes(v)))

  return (
    <div className="space-y-2">
      {selected.length > 0 && (
        <ul className="flex flex-wrap gap-2">
          {selected.map((v) => (
            <li
              key={v}
              className="inline-flex items-center gap-1 rounded-full bg-blue-50 dark:bg-blue-900/30 px-3 py-1 text-sm text-blue-800 dark:text-blue-200"
            >
              {labelFor(v)}
              <button
                type="button"
                onClick={() => setSelected(selected.filter((s) => s !== v))}
                disabled={disabled}
                aria-label={`Remove ${labelFor(v)}`}
                title={`Remove ${labelFor(v)}`}
                className="rounded-full p-0.5 hover:bg-blue-100 dark:hover:bg-blue-800/60"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <select
        id={id}
        value=""
        aria-label={ariaLabel}
        disabled={disabled || remaining.length === 0}
        onChange={(e) => e.target.value && setSelected([...selected, e.target.value])}
        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm disabled:opacity-60"
      >
        <option value="">{remaining.length === 0 ? 'All options selected' : placeholder}</option>
        {remaining.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  )
}
