/**
 * RegisterFieldInput — one input for a Local Register field, switching on field_type (moved from
 * the Platform/Simulator LocalRegisterForm copies, v1311). Used for built-in register fields and
 * organisation custom fields alike.
 */
import MultiLineListInput from './MultiLineListInput'
import TableListInput from './TableListInput'
import { tableColumns } from '@nidus/shared/utils/registerTableField'
import { formatRegionalDate } from '@nidus/shared/utils/formatRegionalSettings'
import MultiSelectDropdown from './MultiSelectDropdown'
import { SmartAmountInput } from './SmartAmountInput'
import SelectField, { SEARCHABLE_SELECT_MIN_OPTIONS } from './SelectField'
import DateTimeInput from './DateTimeInput'
import RecordRefInput from './RecordRefInput'
import { isCalculatedField } from '@nidus/shared/utils/registerCalculations'
import { registerFieldExportValue } from '@nidus/shared/utils/registerCustomFields'

const INPUT_CLASS =
  'w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm'

/**
 * @param {object} props.settings resolved Regional & Format settings (rule 68) — currency code and
 *   decimal places for amount fields; optional (regional defaults apply until loaded).
 * @param {(registerKey: string) => Promise<object[]>} [props.loadRecordOptions] records a
 *   "Record reference" field can point at (v1337); the app passes its own database-bound loader.
 */
export default function RegisterFieldInput({ field, value, onChange, settings = null, loadRecordOptions = null }) {
  const type = field.field_type

  // Calculated fields (v1337) are worked out on save — shown, not typed.
  if (isCalculatedField(field)) {
    const text = registerFieldExportValue(value, field, settings)
    return (
      <div
        className="flex items-center justify-between gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800/60"
        aria-label={field.field_label}
        title="Worked out from the other fields when the record is saved"
      >
        {text
          ? <span className="font-medium tabular-nums text-gray-900 dark:text-gray-100">{text}</span>
          : <span className="text-gray-400 dark:text-gray-500">Calculated when saved</span>}
        {text && <span className="shrink-0 text-xs text-gray-500 dark:text-gray-400">Calculated</span>}
      </div>
    )
  }
  if (type === 'datetime') {
    return <DateTimeInput value={value ?? ''} onChange={onChange} settings={settings} ariaLabel={field.field_label} />
  }
  if (type === 'record_ref') {
    return <RecordRefInput field={field} value={value} onChange={onChange} loadOptions={loadRecordOptions} />
  }

  // Amounts (rule 36 + 68): shorthand like 10k / 3m, grouped display in the organisation's currency.
  if (type === 'currency') {
    return (
      <SmartAmountInput
        id={field.field_key}
        value={value === '' || value === undefined ? null : value}
        onChange={(amount) => onChange(amount ?? '')}
        currency={settings?.currency_code || 'USD'}
        decimals={Number(settings?.decimal_places ?? 2)}
        showCurrencySymbol
        ariaLabel={field.field_label}
        placeholder="e.g. 18.5m"
      />
    )
  }

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
    const options = field.dropdown_options || []
    // Long lists are searchable (rule 69); short ones stay a plain select.
    if (options.length >= SEARCHABLE_SELECT_MIN_OPTIONS) {
      return (
        <SelectField
          id={field.field_key}
          options={options}
          value={value ?? ''}
          onChange={onChange}
          placeholder="Select…"
          searchPlaceholder={`Search ${field.field_label}…`}
        />
      )
    }
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
  if (type === 'table') {
    return (
      <TableListInput
        viewModeId={`local-register-field-${field.register_id}-${field.field_key}`}
        columns={tableColumns(field)}
        value={typeof value === 'string' ? value : value == null ? '' : String(value)}
        onChange={onChange}
        ariaLabelPrefix={field.field_label}
        formatDate={(v) => formatRegionalDate(v, settings)}
      />
    )
  }
  if (type === 'linked_records') {
    const source = (field.dropdown_options || [])[0]?.label || 'the linked register'
    return (
      <p className="rounded-lg border border-dashed border-gray-300 px-3 py-2 text-sm text-gray-600 dark:border-gray-600 dark:text-gray-300">
        Filled from {source}: each of this project&apos;s {source} records appears here and in the exports. Add or change them in {source}.
      </p>
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
  // Numbers (rule 36): thousands separators (814,817) and shorthand like 815k / 1.2m. Whole numbers
  // show no decimals; a value with decimals keeps them (display only — the stored value is not rounded).
  if (type === 'number') {
    const num = value === '' || value === undefined || value === null ? null : Number(value)
    const decimals = num === null || Number.isInteger(num) ? 0 : Math.min((String(num).split('.')[1] || '').length, 4)
    return (
      <SmartAmountInput
        id={field.field_key}
        value={num}
        onChange={(n) => onChange(n ?? '')}
        decimals={decimals}
        ariaLabel={field.field_label}
        placeholder="e.g. 814,817 or 815k"
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
