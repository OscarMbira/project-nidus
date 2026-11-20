/**
 * FieldHelpInputs — the help boxes every field creator shows (v1345 slice 1b, CF-D1/CF-D2).
 * Purpose and example are required; format is optional. Used by organisation custom fields,
 * register custom fields, Regional & Format local fields and form template fields, in Platform
 * and Simulator. The text is shown to users in the ⓘ popover next to the field.
 *
 * value: { help_purpose, help_example, help_format } · onChange(nextValue)
 */
import { isFieldHelpComplete } from '@nidus/shared/utils/fieldHelp'

const inputClass = 'w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 disabled:opacity-60'
const labelClass = 'block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'

export { isFieldHelpComplete }

export default function FieldHelpInputs({ value = {}, onChange, disabled = false, idPrefix = 'field-help', showErrors = false, compact = false }) {
  const set = (key) => (e) => onChange?.({ ...value, [key]: e.target.value })
  const purposeMissing = showErrors && !String(value.help_purpose || value.help || '').trim()
  const exampleMissing = showErrors && !String(value.help_example || '').trim()
  return (
    <fieldset className={`rounded-lg border border-sky-200 dark:border-sky-800 bg-sky-50/60 dark:bg-slate-900/60 ${compact ? 'p-3 space-y-2' : 'p-4 space-y-3'}`} disabled={disabled}>
      <legend className="px-1 text-sm font-semibold text-sky-800 dark:text-sky-300">Help for users</legend>
      <p className="text-xs text-gray-600 dark:text-gray-400">Shown in the ⓘ help next to this field, so people know what to enter.</p>
      <div>
        <label htmlFor={`${idPrefix}-purpose`} className={labelClass}>What is this field for? *</label>
        <textarea
          id={`${idPrefix}-purpose`}
          rows={2}
          required
          value={value.help_purpose ?? value.help ?? ''}
          onChange={set('help_purpose')}
          placeholder="e.g. How important this supplier is to the organisation"
          className={inputClass}
          aria-invalid={purposeMissing || undefined}
        />
        {purposeMissing && <p className="mt-1 text-xs text-red-600 dark:text-red-400">Say what this field is for.</p>}
      </div>
      <div>
        <label htmlFor={`${idPrefix}-example`} className={labelClass}>Example of a good value *</label>
        <input
          id={`${idPrefix}-example`}
          type="text"
          required
          value={value.help_example ?? ''}
          onChange={set('help_example')}
          placeholder="e.g. Tier 1 – Dubai regional supplier"
          className={inputClass}
          aria-invalid={exampleMissing || undefined}
        />
        {exampleMissing && <p className="mt-1 text-xs text-red-600 dark:text-red-400">Give one example value.</p>}
      </div>
      <div>
        <label htmlFor={`${idPrefix}-format`} className={labelClass}>Format (optional)</label>
        <input
          id={`${idPrefix}-format`}
          type="text"
          value={value.help_format ?? ''}
          onChange={set('help_format')}
          placeholder="e.g. A code like LON-001 or CAI-014"
          className={inputClass}
        />
      </div>
    </fieldset>
  )
}

/** Convenience: the help part of a definition, for state initialisation. */
export function pickFieldHelp(def = {}) {
  return {
    help_purpose: def.help_purpose ?? def.help ?? def.description ?? '',
    help_example: def.help_example ?? '',
    help_format: def.help_format ?? '',
  }
}

export const fieldHelpComplete = (value) => isFieldHelpComplete(value)
