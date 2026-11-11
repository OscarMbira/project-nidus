/**
 * CustomFieldSettingsFields (v1314) — the optional settings of a new register custom field:
 * default value, min/max (value, length, date, number of items) and allowed characters. Only the
 * settings that fit the chosen type are shown. Values are kept as typed (strings); the server
 * (public.lr_cf_build_rules) validates them and builds the allowed-characters pattern.
 */
import {
  ALLOWED_CHARACTER_OPTIONS,
  customFieldSettingsFor,
} from '@nidus/shared/utils/registerCustomFields'

const INPUT_CLASS =
  'w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm'
const LABEL_CLASS = 'block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'

function Pair({ idPrefix, label, minKey, maxKey, settings, set, type = 'number', minLabel = 'Minimum', maxLabel = 'Maximum', hint }) {
  return (
    <fieldset className="md:col-span-2">
      <legend className={LABEL_CLASS}>{label}</legend>
      <div className="grid grid-cols-2 gap-3">
        <label className="text-xs text-gray-500 dark:text-gray-400">
          {minLabel}
          <input id={`${idPrefix}-min`} type={type} min={type === 'number' ? 0 : undefined} value={settings[minKey] ?? ''}
            onChange={(e) => set({ [minKey]: e.target.value })} className={`${INPUT_CLASS} mt-1`} aria-label={`${label} — ${minLabel}`} />
        </label>
        <label className="text-xs text-gray-500 dark:text-gray-400">
          {maxLabel}
          <input id={`${idPrefix}-max`} type={type} min={type === 'number' ? 0 : undefined} value={settings[maxKey] ?? ''}
            onChange={(e) => set({ [maxKey]: e.target.value })} className={`${INPUT_CLASS} mt-1`} aria-label={`${label} — ${maxLabel}`} />
        </label>
      </div>
      {hint && <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{hint}</p>}
    </fieldset>
  )
}

function DefaultValueInput({ fieldType, options, settings, set }) {
  const value = settings.defaultValue
  const id = 'cf-default'
  const label = <label htmlFor={id} className={LABEL_CLASS}>Default value</label>

  if (fieldType === 'boolean') {
    return (
      <div>
        {label}
        <select id={id} className={INPUT_CLASS} value={value === true ? 'yes' : value === false ? 'no' : ''}
          onChange={(e) => set({ defaultValue: e.target.value === 'yes' ? true : e.target.value === 'no' ? false : undefined })}>
          <option value="">No default</option>
          <option value="yes">Yes</option>
          <option value="no">No</option>
        </select>
      </div>
    )
  }
  if (fieldType === 'dropdown') {
    return (
      <div>
        {label}
        <select id={id} className={INPUT_CLASS} value={value ?? ''} onChange={(e) => set({ defaultValue: e.target.value || undefined })}>
          <option value="">No default</option>
          {options.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
        {options.length === 0 && <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Add options first.</p>}
      </div>
    )
  }
  if (fieldType === 'multi_select') {
    const selected = Array.isArray(value) ? value : []
    const toggle = (o) => {
      const next = selected.includes(o) ? selected.filter((x) => x !== o) : [...selected, o]
      set({ defaultValue: next.length ? next : undefined })
    }
    return (
      <fieldset className="md:col-span-2">
        <legend className={LABEL_CLASS}>Default values</legend>
        {options.length === 0 ? (
          <p className="text-xs text-gray-500 dark:text-gray-400">Add options first.</p>
        ) : (
          <div className="flex flex-wrap gap-3">
            {options.map((o) => (
              <label key={o} className="inline-flex items-center gap-1.5 text-sm text-gray-700 dark:text-gray-300">
                <input type="checkbox" checked={selected.includes(o)} onChange={() => toggle(o)} />
                {o}
              </label>
            ))}
          </div>
        )}
      </fieldset>
    )
  }
  if (fieldType === 'date') {
    const isToday = value === 'today'
    return (
      <div>
        {label}
        <input id={id} type="date" className={INPUT_CLASS} value={isToday ? '' : value ?? ''} disabled={isToday}
          onChange={(e) => set({ defaultValue: e.target.value || undefined })} />
        <label className="mt-1 inline-flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-400">
          <input type="checkbox" checked={isToday} onChange={(e) => set({ defaultValue: e.target.checked ? 'today' : undefined })} />
          Use the date the record is created
        </label>
      </div>
    )
  }
  if (fieldType === 'long_text' || fieldType === 'multi_line') {
    return (
      <div className="md:col-span-2">
        <label htmlFor={id} className={LABEL_CLASS}>{fieldType === 'multi_line' ? 'Default items (one per line)' : 'Default value'}</label>
        <textarea id={id} rows={3} className={INPUT_CLASS} value={value ?? ''} onChange={(e) => set({ defaultValue: e.target.value })} />
      </div>
    )
  }
  return (
    <div>
      {label}
      <input id={id} type={fieldType === 'number' ? 'number' : fieldType === 'url' ? 'url' : 'text'} className={INPUT_CLASS}
        value={value ?? ''} onChange={(e) => set({ defaultValue: e.target.value })} />
    </div>
  )
}

export default function CustomFieldSettingsFields({ fieldType, options = [], settings = {}, onChange }) {
  const apply = customFieldSettingsFor(fieldType)
  const set = (patch) => onChange({ ...settings, ...patch })

  const isDropdown = fieldType === 'dropdown' || fieldType === 'multi_select'

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {!isDropdown && !['text', 'long_text', 'multi_line'].includes(fieldType) && (
        <p className="md:col-span-2 text-xs text-gray-500 dark:text-gray-400">
          Need a list of values to choose from? Set Type to Dropdown or Multi-select dropdown, then enter the dropdown values.
        </p>
      )}
      <DefaultValueInput fieldType={fieldType} options={options} settings={settings} set={set} />

      {apply.numberRange && (
        <Pair idPrefix="cf-value" label="Allowed values" minKey="min" maxKey="max" settings={settings} set={set} />
      )}
      {apply.dateRange && (
        <Pair idPrefix="cf-date" label="Allowed dates" minKey="minDate" maxKey="maxDate" settings={settings} set={set}
          type="date" minLabel="Earliest" maxLabel="Latest" />
      )}
      {apply.length && (
        <Pair idPrefix="cf-length" label={fieldType === 'multi_line' ? 'Length of each item (characters)' : 'Length (characters)'}
          minKey="minLength" maxKey="maxLength" settings={settings} set={set} />
      )}
      {apply.itemCount && (
        <Pair idPrefix="cf-items" label="Number of items" minKey="minItems" maxKey="maxItems" settings={settings} set={set} />
      )}
      {apply.characters && (
        <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label htmlFor="cf-chars" className={LABEL_CLASS}>Allowed characters</label>
            <select id="cf-chars" className={INPUT_CLASS} value={settings.allowedCharacters || 'any'}
              onChange={(e) => set({ allowedCharacters: e.target.value })}>
              {ALLOWED_CHARACTER_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          {settings.allowedCharacters === 'custom' && (
            <div>
              <label htmlFor="cf-chars-custom" className={LABEL_CLASS}>Characters allowed *</label>
              <input id="cf-chars-custom" type="text" maxLength={100} placeholder="e.g. ABCDEF0123456789-"
                className={`${INPUT_CLASS} font-mono`} value={settings.allowedCharactersCustom || ''}
                onChange={(e) => set({ allowedCharactersCustom: e.target.value })} />
            </div>
          )}
        </div>
      )}
    </div>
  )
}
