/**
 * Shared field editors for Regional & Format Settings (v1062 + local fields v1065).
 * Card ⊞ / Table-List ≡ — parent may own the ViewToggle (pass viewMode / onViewModeChange + showViewToggle={false}).
 */
import { useMemo, useState, useEffect } from 'react'
import { Plus } from 'lucide-react'
import toast from 'react-hot-toast'
import { useViewMode } from '@nidus/shared/hooks/useViewMode'
import ViewToggle from '@nidus/ui/ViewToggle'
import SelectField from '@nidus/ui/SelectField'
import RowActionButton from '@nidus/ui/RowActionButton'
import { platformDb } from '@nidus/supabase'
import { buildIanaTimezoneSelectOptions } from '@nidus/shared/utils/ianaTimezoneOptions.js'
import { slugifyLocalFieldKey } from '@nidus/shared/utils/resolveRegionalFormatSettings.js'
import {
  DATE_FORMAT_OPTIONS,
  NUMBER_GROUPING_OPTIONS,
  FIRST_DAY_OPTIONS,
  LOCALE_OPTIONS,
  TIME_FORMAT_OPTIONS,
  NEGATIVE_STYLE_OPTIONS,
  MONTH_OPTIONS,
  FIELD_LABELS,
  REGIONAL_FORMAT_FIELD_KEYS,
} from '@nidus/shared/utils/regionalFormatConstants.js'
import {
  formatRegionalCurrency,
  formatRegionalDate,
  formatRegionalNumber,
} from '@nidus/shared/utils/formatRegionalSettings.js'

const FIELD_DEFS_BASE = [
  { key: 'country_code', type: 'select', optionsKey: 'countries' },
  { key: 'currency_code', type: 'select', optionsKey: 'currencies' },
  { key: 'locale', type: 'select', options: LOCALE_OPTIONS },
  { key: 'date_format', type: 'select', options: DATE_FORMAT_OPTIONS },
  { key: 'time_zone', type: 'select', optionsKey: 'tz' },
  { key: 'time_format', type: 'select', options: TIME_FORMAT_OPTIONS },
  { key: 'first_day_of_week', type: 'select', options: FIRST_DAY_OPTIONS },
  { key: 'decimal_places', type: 'number', min: 0, max: 6 },
  { key: 'percent_decimals', type: 'number', min: 0, max: 4 },
  { key: 'number_grouping', type: 'select', options: NUMBER_GROUPING_OPTIONS },
  { key: 'negative_number_style', type: 'select', options: NEGATIVE_STYLE_OPTIONS },
  { key: 'fiscal_year_start_month', type: 'select', options: MONTH_OPTIONS, numeric: true },
]

const LOCAL_TYPE_OPTIONS = [
  { value: 'text', label: 'Text' },
  { value: 'number', label: 'Number' },
  { value: 'boolean', label: 'Yes / No' },
  { value: 'date', label: 'Date' },
]

export const REGIONAL_FORMAT_EXPORT_SECTIONS = [
  {
    title: 'Regional & Format Settings',
    fields: FIELD_DEFS_BASE.map((d) => ({ key: d.key, label: FIELD_LABELS[d.key] })),
  },
]

function LocalBadge({ projectOnly }) {
  return (
    <span className="inline-flex items-center gap-1 flex-wrap">
      <span className="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-200">
        Local
      </span>
      {projectOnly && (
        <span className="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-200">
          Project only
        </span>
      )}
    </span>
  )
}

function LocalValueControl({ def, id, value, onChange, disabled, hideLabel = false }) {
  const label = def.label
  const type = def.value_type
  if (type === 'boolean') {
    return (
      <div>
        {!hideLabel && (
          <label htmlFor={id} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{label}</label>
        )}
        <label className="inline-flex items-center gap-2 text-sm text-gray-800 dark:text-gray-100">
          <input
            id={id}
            type="checkbox"
            checked={!!value}
            onChange={(e) => onChange(e.target.checked)}
            disabled={disabled}
            className="rounded border-gray-300 dark:border-gray-600"
          />
          {value ? 'Yes' : 'No'}
        </label>
      </div>
    )
  }
  if (type === 'number') {
    return (
      <div>
        {!hideLabel && (
          <label htmlFor={id} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{label}</label>
        )}
        <input
          id={id}
          type="number"
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value))}
          disabled={disabled}
          aria-label={hideLabel ? label : undefined}
          className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white disabled:opacity-60"
        />
      </div>
    )
  }
  if (type === 'date') {
    return (
      <div>
        {!hideLabel && (
          <label htmlFor={id} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{label}</label>
        )}
        <input
          id={id}
          type="date"
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          aria-label={hideLabel ? label : undefined}
          className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white disabled:opacity-60"
        />
      </div>
    )
  }
  return (
    <div>
      {!hideLabel && (
        <label htmlFor={id} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{label}</label>
      )}
      <input
        id={id}
        type="text"
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        aria-label={hideLabel ? label : undefined}
        className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white disabled:opacity-60"
      />
    </div>
  )
}

function FieldControl({ def, id, value, onChange, disabled, hideLabel = false }) {
  const label = FIELD_LABELS[def.key]
  if (def.type === 'number') {
    return (
      <div>
        {!hideLabel && (
          <label htmlFor={id} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{label}</label>
        )}
        <input
          id={id}
          type="number"
          min={def.min}
          max={def.max}
          value={value ?? ''}
          onChange={(e) => onChange(Number(e.target.value))}
          disabled={disabled}
          aria-label={hideLabel ? label : undefined}
          className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white disabled:opacity-60"
        />
      </div>
    )
  }
  return (
    <div>
      {!hideLabel && (
        <label htmlFor={id} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{label}</label>
      )}
      <SelectField
        id={id}
        options={def.options || []}
        value={value ?? ''}
        onChange={(v) => onChange(def.numeric ? Number(v) : v)}
        disabled={disabled}
        aria-label={hideLabel ? label : label}
        placeholder={`Select ${label.toLowerCase()}...`}
        searchPlaceholder={`Search ${label.toLowerCase()}...`}
        forceSearchable={def.key === 'time_zone' || def.key === 'country_code' || def.key === 'currency_code'}
        combobox={def.key === 'time_zone' || def.key === 'country_code' || def.key === 'currency_code'}
      />
    </div>
  )
}

function formatLocalDisplay(value, valueType) {
  if (value == null || value === '') return '—'
  if (valueType === 'boolean') return value ? 'Yes' : 'No'
  return String(value)
}

/**
 * @param {{
 *   values: object,
 *   onChange: (key: string, value: any) => void,
 *   disabled?: boolean,
 *   mode?: 'org'|'project',
 *   orgDefaults?: object,
 *   overrideFlags?: Record<string, boolean>,
 *   onToggleOverride?: (key: string, on: boolean) => void,
 *   viewModeId?: string,
 *   viewMode?: 'grid'|'list',
 *   onViewModeChange?: (v: 'grid'|'list') => void,
 *   showViewToggle?: boolean,
 *   localDefinitions?: Array<object>,
 *   localValues?: Record<string, any>,
 *   onLocalValueChange?: (id: string, value: any) => void,
 *   localOverrideFlags?: Record<string, boolean>,
 *   onToggleLocalOverride?: (id: string, on: boolean) => void,
 *   localOrgDefaults?: Record<string, any>,
 *   canManageDefinitions?: boolean,
 *   onCreateDefinition?: (input: object) => Promise<{success:boolean, error?:string}>,
 *   onSoftDeleteDefinition?: (id: string) => Promise<{success:boolean, error?:string}>,
 * }} props
 */
export default function RegionalFormatFields({
  values,
  onChange,
  disabled = false,
  mode = 'org',
  orgDefaults = {},
  overrideFlags = {},
  onToggleOverride,
  viewModeId,
  viewMode: viewModeProp,
  onViewModeChange,
  showViewToggle = true,
  localDefinitions = [],
  localValues = {},
  onLocalValueChange,
  localOverrideFlags = {},
  onToggleLocalOverride,
  localOrgDefaults = {},
  canManageDefinitions = false,
  onCreateDefinition,
  onSoftDeleteDefinition,
}) {
  const isProject = mode === 'project'
  const [internalViewMode, setInternalViewMode] = useViewMode(
    viewModeId || (isProject ? 'regional-format-project' : 'regional-format-org'),
    'list',
  )
  const controlled = typeof onViewModeChange === 'function' && viewModeProp != null
  const viewMode = controlled ? viewModeProp : internalViewMode
  const setViewMode = controlled ? onViewModeChange : setInternalViewMode
  const previewSettings = values
  const [countryOptions, setCountryOptions] = useState([])
  const [currencyOptions, setCurrencyOptions] = useState([])
  const [showAdd, setShowAdd] = useState(false)
  const [adding, setAdding] = useState(false)
  const [newLabel, setNewLabel] = useState('')
  const [newKey, setNewKey] = useState('')
  const [newType, setNewType] = useState('text')
  const [newDefault, setNewDefault] = useState('')
  const [keyTouched, setKeyTouched] = useState(false)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const { data, error } = await platformDb
          .from('countries')
          .select('code, name')
          .eq('is_active', true)
          .eq('is_deleted', false)
          .order('name', { ascending: true })
        if (error) throw error
        if (cancelled) return
        setCountryOptions(
          (data || [])
            .filter((c) => c?.code)
            .map((c) => ({
              value: String(c.code).toUpperCase(),
              label: `${String(c.code).toUpperCase()} — ${c.name || c.code}`,
            })),
        )
      } catch (e) {
        console.warn('Failed to load countries for regional format:', e?.message || e)
        if (!cancelled) setCountryOptions([])
      }
    })()
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const { data, error } = await platformDb
          .from('currencies')
          .select('code, name')
          .eq('is_active', true)
          .eq('is_deleted', false)
          .order('name', { ascending: true })
        if (error) throw error
        if (cancelled) return
        setCurrencyOptions(
          (data || [])
            .filter((c) => c?.code)
            .map((c) => ({
              value: String(c.code).toUpperCase(),
              label: `${String(c.code).toUpperCase()} — ${c.name || c.code}`,
            })),
        )
      } catch (e) {
        console.warn('Failed to load currencies for regional format:', e?.message || e)
        if (!cancelled) setCurrencyOptions([])
      }
    })()
    return () => { cancelled = true }
  }, [])

  const fieldDefs = useMemo(() => {
    const tzOptions = buildIanaTimezoneSelectOptions()
    return FIELD_DEFS_BASE.map((def) => {
      if (def.optionsKey === 'tz') return { ...def, options: tzOptions }
      if (def.optionsKey === 'countries') return { ...def, options: countryOptions }
      if (def.optionsKey === 'currencies') return { ...def, options: currencyOptions }
      return def
    })
  }, [countryOptions, currencyOptions])

  const formatOrgDefault = (key, raw) => {
    if (raw == null || raw === '') return '—'
    if (key === 'country_code') {
      const hit = countryOptions.find((o) => String(o.value) === String(raw).toUpperCase())
      return hit?.label || String(raw)
    }
    if (key === 'currency_code') {
      const hit = currencyOptions.find((o) => String(o.value) === String(raw).toUpperCase())
      return hit?.label || String(raw)
    }
    return String(raw)
  }

  const canDeleteDef = (def) => {
    if (!canManageDefinitions || !onSoftDeleteDefinition) return false
    if (isProject) return !!def.project_id
    return !def.project_id
  }

  const handleSoftDelete = async (def) => {
    if (!canDeleteDef(def)) return
    if (!window.confirm(`Remove local field “${def.label}”? Historical values are kept.`)) return
    const res = await onSoftDeleteDefinition(def.id)
    if (!res?.success) toast.error(res?.error || 'Could not remove field')
  }

  const resetAddForm = () => {
    setNewLabel('')
    setNewKey('')
    setNewType('text')
    setNewDefault('')
    setKeyTouched(false)
  }

  const handleCreate = async (e) => {
    e.preventDefault()
    if (!onCreateDefinition) return
    const label = newLabel.trim()
    const fieldKey = (keyTouched ? newKey : slugifyLocalFieldKey(label)).trim()
    if (!label || !fieldKey) {
      toast.error('Label and key are required')
      return
    }
    setAdding(true)
    try {
      const res = await onCreateDefinition({
        label,
        fieldKey,
        valueType: newType,
        defaultValue: newType === 'boolean'
          ? (newDefault === 'true' || newDefault === true ? 'true' : 'false')
          : newDefault,
      })
      if (!res?.success) throw new Error(res?.error || 'Create failed')
      resetAddForm()
      setShowAdd(false)
    } catch (err) {
      toast.error(err?.message || 'Failed to add local field')
    } finally {
      setAdding(false)
    }
  }

  const renderLocalCard = (def, index) => {
    const id = def.id
    const projectOnly = !!def.project_id
    const overridden = projectOnly || !!localOverrideFlags[id]
    const fieldDisabled = disabled || (isProject && !projectOnly && !overridden)
    return (
      <div key={id} className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-3 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{def.label}</span>
              <LocalBadge projectOnly={projectOnly} />
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">#{index + 1} · {def.field_key}</p>
          </div>
          {canDeleteDef(def) && (
            <RowActionButton variant="delete" label="Remove local field" onClick={() => handleSoftDelete(def)} />
          )}
        </div>
        {isProject && !projectOnly && (
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <label className="inline-flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200">
              <input
                type="checkbox"
                checked={overridden}
                onChange={(e) => onToggleLocalOverride?.(id, e.target.checked)}
                disabled={disabled}
                className="rounded border-gray-300 dark:border-gray-600"
              />
              Override {def.label}
            </label>
            {!overridden && (
              <span className="text-xs text-gray-500 dark:text-gray-400">
                Org default: {formatLocalDisplay(localOrgDefaults[id], def.value_type)}
              </span>
            )}
          </div>
        )}
        <div className={isProject && !projectOnly && !overridden ? 'opacity-70' : ''}>
          <LocalValueControl
            def={def}
            id={`rfs_local_${id}`}
            value={localValues[id]}
            onChange={(v) => onLocalValueChange?.(id, v)}
            disabled={fieldDisabled}
          />
        </div>
      </div>
    )
  }

  const renderCard = (def) => {
    const key = def.key
    const overridden = !!overrideFlags[key]
    const fieldDisabled = disabled || (isProject && !overridden)
    return (
      <div key={key} className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-3 space-y-2">
        {isProject && (
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <label className="inline-flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200">
              <input
                type="checkbox"
                checked={overridden}
                onChange={(e) => onToggleOverride?.(key, e.target.checked)}
                disabled={disabled}
                className="rounded border-gray-300 dark:border-gray-600"
              />
              Override {FIELD_LABELS[key]}
            </label>
            {!overridden && (
              <span className="text-xs text-gray-500 dark:text-gray-400">
                Org default: {formatOrgDefault(key, orgDefaults[key])}
              </span>
            )}
          </div>
        )}
        <div className={isProject && !overridden ? 'opacity-70' : ''}>
          <FieldControl
            def={def}
            id={`rfs_${key}`}
            value={values[key]}
            onChange={(v) => onChange(key, v)}
            disabled={fieldDisabled}
          />
        </div>
      </div>
    )
  }

  const coreCount = fieldDefs.length

  const renderTable = () => (
    <div className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-visible bg-white dark:bg-gray-800">
      <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
        <thead className="bg-gray-50 dark:bg-gray-700">
          <tr>
            <th scope="col" className="w-12 px-3 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-300 uppercase tracking-wider">#</th>
            <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-300 uppercase tracking-wider">Setting</th>
            {isProject && (
              <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-300 uppercase tracking-wider w-28">Override</th>
            )}
            {isProject && (
              <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-300 uppercase tracking-wider">Org default</th>
            )}
            <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-300 uppercase tracking-wider min-w-[12rem]">Value</th>
            {canManageDefinitions && (
              <th scope="col" className="w-14 px-3 py-3 text-right text-xs font-medium text-gray-600 dark:text-gray-300 uppercase tracking-wider"> </th>
            )}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
          {fieldDefs.map((def, index) => {
            const key = def.key
            const overridden = !!overrideFlags[key]
            const fieldDisabled = disabled || (isProject && !overridden)
            return (
              <tr key={key} className="group">
                <td className="px-3 py-3 text-sm tabular-nums text-gray-700 dark:text-gray-200">{index + 1}</td>
                <td className="px-3 py-3 text-sm font-medium text-gray-900 dark:text-gray-100">{FIELD_LABELS[key]}</td>
                {isProject && (
                  <td className="px-3 py-3">
                    <input
                      type="checkbox"
                      checked={overridden}
                      onChange={(e) => onToggleOverride?.(key, e.target.checked)}
                      disabled={disabled}
                      aria-label={`Override ${FIELD_LABELS[key]}`}
                      className="rounded border-gray-300 dark:border-gray-600"
                    />
                  </td>
                )}
                {isProject && (
                  <td className="px-3 py-3 text-sm text-gray-700 dark:text-gray-200">
                    {formatOrgDefault(key, orgDefaults[key])}
                  </td>
                )}
                <td className={`px-3 py-2 ${isProject && !overridden ? 'opacity-70' : ''}`}>
                  <FieldControl
                    def={def}
                    id={`rfs_tbl_${key}`}
                    value={values[key]}
                    onChange={(v) => onChange(key, v)}
                    disabled={fieldDisabled}
                    hideLabel
                  />
                </td>
                {canManageDefinitions && <td />}
              </tr>
            )
          })}
          {localDefinitions.map((def, i) => {
            const id = def.id
            const rowNum = coreCount + i + 1
            const projectOnly = !!def.project_id
            const overridden = projectOnly || !!localOverrideFlags[id]
            const fieldDisabled = disabled || (isProject && !projectOnly && !overridden)
            return (
              <tr key={id} className="group">
                <td className="px-3 py-3 text-sm tabular-nums text-gray-700 dark:text-gray-200">{rowNum}</td>
                <td className="px-3 py-3 text-sm font-medium text-gray-900 dark:text-gray-100">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span>{def.label}</span>
                    <LocalBadge projectOnly={projectOnly} />
                  </div>
                </td>
                {isProject && (
                  <td className="px-3 py-3">
                    {!projectOnly ? (
                      <input
                        type="checkbox"
                        checked={overridden}
                        onChange={(e) => onToggleLocalOverride?.(id, e.target.checked)}
                        disabled={disabled}
                        aria-label={`Override ${def.label}`}
                        className="rounded border-gray-300 dark:border-gray-600"
                      />
                    ) : (
                      <span className="text-xs text-gray-500 dark:text-gray-400">—</span>
                    )}
                  </td>
                )}
                {isProject && (
                  <td className="px-3 py-3 text-sm text-gray-700 dark:text-gray-200">
                    {projectOnly ? '—' : formatLocalDisplay(localOrgDefaults[id], def.value_type)}
                  </td>
                )}
                <td className={`px-3 py-2 ${isProject && !projectOnly && !overridden ? 'opacity-70' : ''}`}>
                  <LocalValueControl
                    def={def}
                    id={`rfs_tbl_local_${id}`}
                    value={localValues[id]}
                    onChange={(v) => onLocalValueChange?.(id, v)}
                    disabled={fieldDisabled}
                    hideLabel
                  />
                </td>
                {canManageDefinitions && (
                  <td className="px-3 py-2 text-right">
                    {canDeleteDef(def) && (
                      <RowActionButton variant="delete" label="Remove local field" onClick={() => handleSoftDelete(def)} />
                    )}
                  </td>
                )}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )

  return (
    <div className="space-y-4">
      {showViewToggle && (
        <div className="flex items-center justify-end gap-2">
          <span className="text-sm text-gray-500 dark:text-gray-400">View</span>
          <ViewToggle
            value={viewMode}
            onChange={setViewMode}
            ariaLabel="Regional format fields layout"
          />
        </div>
      )}

      {viewMode === 'list' ? (
        renderTable()
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {fieldDefs.map((def) => renderCard(def))}
          {localDefinitions.map((def, i) => renderLocalCard(def, coreCount + i))}
        </div>
      )}

      {canManageDefinitions && (
        <div className="space-y-3">
          {!showAdd ? (
            <button
              type="button"
              onClick={() => setShowAdd(true)}
              disabled={disabled}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-sm font-medium text-gray-800 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
            >
              <Plus className="h-4 w-4" /> Add local field
            </button>
          ) : (
            <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 space-y-3">
              <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                {isProject ? 'Add project-only local field' : 'Add organisation local field'}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Label</label>
                  <input
                    type="text"
                    value={newLabel}
                    onChange={(e) => {
                      setNewLabel(e.target.value)
                      if (!keyTouched) setNewKey(slugifyLocalFieldKey(e.target.value))
                    }}
                    className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Key</label>
                  <input
                    type="text"
                    value={newKey}
                    onChange={(e) => {
                      setKeyTouched(true)
                      setNewKey(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 64))
                    }}
                    className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Type</label>
                  <SelectField
                    options={LOCAL_TYPE_OPTIONS}
                    value={newType}
                    onChange={setNewType}
                    forceNative
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Default</label>
                  {newType === 'boolean' ? (
                    <SelectField
                      options={[
                        { value: 'false', label: 'No' },
                        { value: 'true', label: 'Yes' },
                      ]}
                      value={newDefault === 'true' ? 'true' : 'false'}
                      onChange={setNewDefault}
                      forceNative
                    />
                  ) : newType === 'date' ? (
                    <input
                      type="date"
                      value={newDefault}
                      onChange={(e) => setNewDefault(e.target.value)}
                      className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white"
                    />
                  ) : (
                    <input
                      type={newType === 'number' ? 'number' : 'text'}
                      value={newDefault}
                      onChange={(e) => setNewDefault(e.target.value)}
                      className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white"
                    />
                  )}
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => { resetAddForm(); setShowAdd(false) }}
                  className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-sm text-gray-800 dark:text-gray-100"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={adding}
                  onClick={handleCreate}
                  className="px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium disabled:opacity-50"
                >
                  {adding ? 'Adding…' : 'Add field'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/80 p-4 text-sm text-gray-700 dark:text-gray-200 space-y-1">
        <p className="font-semibold text-gray-900 dark:text-gray-100">Preview</p>
        <p>Date: {formatRegionalDate(new Date(), previewSettings)}</p>
        <p>Number: {formatRegionalNumber(1234567.89, previewSettings)}</p>
        <p>Currency: {formatRegionalCurrency(420000, previewSettings)}</p>
        <p>Negative: {formatRegionalNumber(-1234.5, previewSettings)}</p>
        <p>Percent (12.5): {formatRegionalNumber(12.5, previewSettings, { style: 'percent' })}</p>
      </div>
    </div>
  )
}

export { REGIONAL_FORMAT_FIELD_KEYS }
