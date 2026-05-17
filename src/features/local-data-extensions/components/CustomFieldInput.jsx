import { isOptionBackedType } from '../utils/fieldTypeRegistry'

export default function CustomFieldInput({
  definition,
  value,
  onChange,
  disabled,
  error,
  showLabel = true,
}) {
  const type = definition.field_type
  const opts = definition.options || []
  const label = definition.label
  const help = definition.description
  const sensitive = definition.is_sensitive && disabled

  const commonLabel = showLabel ? (
    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
      {label}
      {definition.validation_rules?.required ? <span className="text-red-500 ml-0.5">*</span> : null}
    </label>
  ) : null

  const errBlock =
    error ? <p className="mt-1 text-xs text-red-600 dark:text-red-400">{error}</p> : null

  const baseInput =
    'w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm'

  if (sensitive) {
    return (
      <div>
        {commonLabel}
        <p className="text-sm text-gray-500 dark:text-gray-400 italic">Hidden (sensitive)</p>
        {errBlock}
      </div>
    )
  }

  if (type === 'boolean') {
    return (
      <div>
        {commonLabel}
        <label className="inline-flex items-center gap-2 text-sm text-gray-800 dark:text-gray-200">
          <input
            type="checkbox"
            checked={Boolean(value)}
            onChange={(e) => onChange(e.target.checked)}
            disabled={disabled}
          />
          {help || label}
        </label>
        {errBlock}
      </div>
    )
  }

  if (type === 'long_text' || type === 'json') {
    return (
      <div>
        {commonLabel}
        <textarea
          className={`${baseInput} min-h-[96px]`}
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
        />
        {help ? <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{help}</p> : null}
        {errBlock}
      </div>
    )
  }

  if (type === 'dropdown' && isOptionBackedType(type)) {
    return (
      <div>
        {commonLabel}
        <select
          className={baseInput}
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
        >
          <option value="">—</option>
          {opts.map((o) => (
            <option key={o.id || o.option_value} value={o.option_value}>
              {o.option_label || o.option_value}
            </option>
          ))}
        </select>
        {help ? <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{help}</p> : null}
        {errBlock}
      </div>
    )
  }

  if (type === 'multi_select') {
    const arr = Array.isArray(value) ? value : []
    const toggle = (v) => {
      if (arr.includes(v)) onChange(arr.filter((x) => x !== v))
      else onChange([...arr, v])
    }
    return (
      <div>
        {commonLabel}
        <div className="flex flex-wrap gap-2">
          {opts.map((o) => (
            <label key={o.id || o.option_value} className="inline-flex items-center gap-1 text-sm">
              <input
                type="checkbox"
                checked={arr.includes(o.option_value)}
                onChange={() => toggle(o.option_value)}
                disabled={disabled}
              />
              {o.option_label || o.option_value}
            </label>
          ))}
        </div>
        {help ? <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{help}</p> : null}
        {errBlock}
      </div>
    )
  }

  const inputType =
    type === 'number' || type === 'integer'
      ? 'number'
      : type === 'date'
        ? 'date'
        : type === 'datetime'
          ? 'datetime-local'
          : type === 'email'
            ? 'email'
            : 'text'

  return (
    <div>
      {commonLabel}
      <input
        type={inputType}
        className={baseInput}
        value={value ?? ''}
        onChange={(e) => onChange(type === 'number' || type === 'integer' ? e.target.valueAsNumber || e.target.value : e.target.value)}
        disabled={disabled}
      />
      {help ? <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{help}</p> : null}
      {errBlock}
    </div>
  )
}
