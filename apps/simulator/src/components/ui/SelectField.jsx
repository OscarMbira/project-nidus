/**
 * SelectField — themed single-select that auto-switches to SearchableSelect
 * when the option list is long (v1064).
 *
 * Switch: forceNative → native; else forceSearchable || options.length >= 12 → SearchableSelect;
 * else themed native <select>.
 */
import SearchableSelect from './SearchableSelect.jsx'

/** Minimum option count that triggers searchable UI (unless forced). */
export const SEARCHABLE_SELECT_MIN_OPTIONS = 12

function optionValue(opt) {
  if (opt == null) return ''
  if (typeof opt === 'string' || typeof opt === 'number') return opt
  return opt.value ?? opt.code ?? ''
}

function optionLabel(opt) {
  if (opt == null) return ''
  if (typeof opt === 'string' || typeof opt === 'number') return String(opt)
  return opt.label ?? opt.name ?? String(opt.value ?? opt.code ?? '')
}

/**
 * @param {object} props
 * @param {Array} props.options
 * @param {string|number} [props.value]
 * @param {(value: string|number) => void} props.onChange
 * @param {string} [props.placeholder]
 * @param {string} [props.searchPlaceholder]
 * @param {boolean} [props.disabled]
 * @param {boolean} [props.required]
 * @param {boolean} [props.allowCustom]
 * @param {boolean} [props.forceSearchable]
 * @param {boolean} [props.forceNative]
 * @param {boolean} [props.openAbove]
 * @param {boolean} [props.combobox]
 * @param {string} [props.className]
 * @param {string} [props.id]
 * @param {string} [props.name]
 * @param {string} [props['aria-label']]
 * @param {import('react').ComponentType} [props.icon]
 * @param {boolean} [props.loading]
 * @param {string} [props.descriptionColumnLabel]
 */
export default function SelectField({
  options = [],
  value = '',
  onChange,
  placeholder = 'Select...',
  searchPlaceholder = 'Search...',
  disabled = false,
  required = false,
  allowCustom = false,
  customValueActions = [],
  forceSearchable = false,
  forceNative = false,
  openAbove = false,
  combobox = false,
  className = '',
  id,
  name,
  icon,
  loading = false,
  descriptionColumnLabel = '',
  descriptionColumnBeside = false,
  'aria-label': ariaLabel,
}) {
  const list = Array.isArray(options) ? options : []
  const useSearchable =
    !forceNative && (forceSearchable || list.length >= SEARCHABLE_SELECT_MIN_OPTIONS)

  if (useSearchable) {
    return (
      <SearchableSelect
        options={list}
        value={value ?? ''}
        onChange={onChange}
        placeholder={placeholder}
        searchPlaceholder={searchPlaceholder}
        disabled={disabled}
        required={required}
        allowCustom={allowCustom}
        customValueActions={customValueActions}
        openAbove={openAbove}
        combobox={combobox}
        className={className}
        icon={icon}
        loading={loading}
        descriptionColumnLabel={descriptionColumnLabel}
        descriptionColumnBeside={descriptionColumnBeside}
      />
    )
  }

  const COLOUR_CLASSES = 'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100'
  const nativeClass = className
    ? `${className} ${className.includes('bg-') ? '' : COLOUR_CLASSES} rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm disabled:opacity-60 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none`.trim()
    : `w-full rounded-lg border border-gray-300 dark:border-gray-600 ${COLOUR_CLASSES} px-3 py-2 text-sm disabled:opacity-60 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none`

  return (
    <select
      id={id}
      name={name}
      value={value ?? ''}
      onChange={(e) => {
        const raw = e.target.value
        const matched = list.find((opt) => String(optionValue(opt)) === String(raw))
        const next = matched != null ? optionValue(matched) : raw
        onChange?.(next)
      }}
      disabled={disabled}
      required={required}
      aria-label={ariaLabel}
      className={nativeClass}
    >
      <option value="" className="bg-white text-gray-900 dark:bg-gray-800 dark:text-gray-100">{placeholder}</option>
      {list.map((opt, index) => {
        const v = optionValue(opt)
        return (
          <option key={String(v) || index} value={v} className="bg-white text-gray-900 dark:bg-gray-800 dark:text-gray-100">
            {optionLabel(opt)}
          </option>
        )
      })}
    </select>
  )
}

export { optionValue, optionLabel }
