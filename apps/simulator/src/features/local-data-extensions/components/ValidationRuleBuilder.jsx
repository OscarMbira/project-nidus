/**
 * Validation rules editor for an LDE field definition. v1314 adds Default value, Min length,
 * earliest/latest date and min/max number of items (keys used by Local Register custom fields);
 * inputs adapt to `fieldType` when given. Unknown keys in `rules` are kept on save.
 */
const INPUT = 'rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-2 py-1'

function DefaultValueInput({ fieldType, options, value, onChange }) {
  if (fieldType === 'boolean') {
    return (
      <select className={`mt-1 w-full ${INPUT}`} value={value === true ? 'yes' : value === false ? 'no' : ''}
        onChange={(e) => onChange(e.target.value === 'yes' ? true : e.target.value === 'no' ? false : undefined)}>
        <option value="">No default</option>
        <option value="yes">Yes</option>
        <option value="no">No</option>
      </select>
    )
  }
  if (fieldType === 'dropdown') {
    return (
      <select className={`mt-1 w-full ${INPUT}`} value={value ?? ''} onChange={(e) => onChange(e.target.value || undefined)}>
        <option value="">No default</option>
        {options.map((o) => <option key={o.option_value} value={o.option_value}>{o.option_label}</option>)}
      </select>
    )
  }
  if (fieldType === 'multi_select') {
    const selected = Array.isArray(value) ? value : []
    const toggle = (v) => {
      const next = selected.includes(v) ? selected.filter((x) => x !== v) : [...selected, v]
      onChange(next.length ? next : undefined)
    }
    return (
      <div className="mt-1 flex flex-wrap gap-3">
        {options.map((o) => (
          <label key={o.option_value} className="inline-flex items-center gap-1">
            <input type="checkbox" checked={selected.includes(o.option_value)} onChange={() => toggle(o.option_value)} />
            {o.option_label}
          </label>
        ))}
        {!options.length && <span className="text-gray-500">No options defined.</span>}
      </div>
    )
  }
  if (fieldType === 'date' || fieldType === 'datetime') {
    const isToday = value === 'today'
    return (
      <div className="mt-1 flex flex-wrap items-center gap-3">
        <input type="date" className={INPUT} value={isToday ? '' : value ?? ''} disabled={isToday}
          onChange={(e) => onChange(e.target.value || undefined)} />
        <label className="inline-flex items-center gap-1">
          <input type="checkbox" checked={isToday} onChange={(e) => onChange(e.target.checked ? 'today' : undefined)} />
          Date the record is created
        </label>
      </div>
    )
  }
  if (fieldType === 'number' || fieldType === 'integer') {
    return (
      <input type="number" className={`mt-1 w-full ${INPUT}`} value={value ?? ''}
        onChange={(e) => onChange(e.target.value === '' ? undefined : Number(e.target.value))} />
    )
  }
  if (fieldType === 'long_text' || fieldType === 'multi_line' || fieldType === 'json') {
    return (
      <textarea rows={3} className={`mt-1 w-full ${INPUT}`} value={value ?? ''}
        placeholder={fieldType === 'multi_line' ? 'One item per line' : ''} onChange={(e) => onChange(e.target.value || undefined)} />
    )
  }
  return <input className={`mt-1 w-full ${INPUT}`} value={value ?? ''} onChange={(e) => onChange(e.target.value || undefined)} />
}

export default function ValidationRuleBuilder({ rules = {}, onChange, fieldType = null, options = [] }) {
  const r = rules || {}
  const set = (patch) => onChange?.({ ...r, ...patch })
  const numberOrUndefined = (v) => (v === '' ? undefined : Number(v))
  const any = !fieldType
  const is = (...types) => any || types.includes(fieldType)

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
      <label className="flex items-center gap-2">
        <input type="checkbox" checked={!!r.required} onChange={(e) => set({ required: e.target.checked })} />
        Required
      </label>
      <input
        className={INPUT}
        placeholder="Required message"
        value={r.requiredMessage || ''}
        onChange={(e) => set({ requiredMessage: e.target.value })}
      />
      <label className="md:col-span-2">
        Default value
        <DefaultValueInput fieldType={fieldType} options={options} value={r.defaultValue}
          onChange={(v) => set({ defaultValue: v })} />
      </label>
      {is('text', 'long_text', 'url', 'email', 'multi_line') && (
        <label className="md:col-span-2">
          Min / Max length{fieldType === 'multi_line' ? ' (per item)' : ''}
          <div className="flex gap-2 mt-1">
            <input type="number" min={0} className={`flex-1 ${INPUT}`} placeholder="Min" value={r.minLength ?? ''}
              onChange={(e) => set({ minLength: numberOrUndefined(e.target.value) })} />
            <input type="number" min={0} className={`flex-1 ${INPUT}`} placeholder="Max" value={r.maxLength ?? ''}
              onChange={(e) => set({ maxLength: numberOrUndefined(e.target.value) })} />
          </div>
        </label>
      )}
      {is('number', 'integer') && (
        <label className="md:col-span-2">
          Min / Max (numbers)
          <div className="flex gap-2 mt-1">
            <input type="number" className={`flex-1 ${INPUT}`} placeholder="Min" value={r.min ?? ''}
              onChange={(e) => set({ min: numberOrUndefined(e.target.value) })} />
            <input type="number" className={`flex-1 ${INPUT}`} placeholder="Max" value={r.max ?? ''}
              onChange={(e) => set({ max: numberOrUndefined(e.target.value) })} />
          </div>
        </label>
      )}
      {is('date', 'datetime') && (
        <label className="md:col-span-2">
          Earliest / Latest date
          <div className="flex gap-2 mt-1">
            <input type="date" className={`flex-1 ${INPUT}`} value={r.minDate ?? ''} onChange={(e) => set({ minDate: e.target.value || undefined })} />
            <input type="date" className={`flex-1 ${INPUT}`} value={r.maxDate ?? ''} onChange={(e) => set({ maxDate: e.target.value || undefined })} />
          </div>
        </label>
      )}
      {is('multi_line', 'multi_select') && (
        <label className="md:col-span-2">
          Min / Max number of items
          <div className="flex gap-2 mt-1">
            <input type="number" min={0} className={`flex-1 ${INPUT}`} placeholder="Min" value={r.minItems ?? ''}
              onChange={(e) => set({ minItems: numberOrUndefined(e.target.value) })} />
            <input type="number" min={0} className={`flex-1 ${INPUT}`} placeholder="Max" value={r.maxItems ?? ''}
              onChange={(e) => set({ maxItems: numberOrUndefined(e.target.value) })} />
          </div>
        </label>
      )}
      {is('text', 'long_text', 'url', 'email', 'multi_line') && (
        <>
          <label className="md:col-span-2">
            Regex pattern (allowed characters)
            <input
              className={`mt-1 w-full ${INPUT} font-mono text-xs`}
              value={r.pattern || ''}
              onChange={(e) => set({ pattern: e.target.value || undefined })}
            />
          </label>
          <label className="md:col-span-2">
            Pattern message
            <input
              className={`mt-1 w-full ${INPUT}`}
              value={r.patternMessage || ''}
              onChange={(e) => set({ patternMessage: e.target.value })}
            />
          </label>
        </>
      )}
    </div>
  )
}
