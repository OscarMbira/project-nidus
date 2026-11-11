/**
 * AddRegisterCustomFieldPanel (v1311) — add an organisation custom field to a register.
 * Non-modal (CLAUDE.md rule 65): an inline panel inside the register form's Custom Fields tab,
 * so the record being edited stays on screen and unsaved values are kept.
 * Step 1 shows the organisation's existing custom fields so users attach instead of duplicating
 * (PRD D12); step 2 creates a new field. Exact-name duplicates are blocked (and the server
 * re-checks), similar names get "Did you mean …?". Data access is passed in as callbacks so
 * Platform and Simulator bind their own services.
 */
import { useMemo, useState } from 'react'
import { ChevronDown, ChevronRight, Search, X } from 'lucide-react'
import Button from './Button'
import CustomFieldSettingsFields from './CustomFieldSettingsFields'
import MultiLineListInput from './MultiLineListInput'
import {
  CUSTOM_FIELD_TYPES,
  OPTION_FIELD_TYPES,
  fieldTypeLabel,
  findExactFieldMatch,
  findSimilarFields,
  customFieldSettingsErrors,
} from '@nidus/shared/utils/registerCustomFields'

const INPUT_CLASS =
  'w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm'

/** Mounted only while open, so every opening starts with an empty form. */
export default function AddRegisterCustomFieldPanel(props) {
  return props.isOpen ? <AddRegisterCustomFieldPanelContent {...props} /> : null
}

function AddRegisterCustomFieldPanelContent({
  onClose,
  registerLabel = 'this register',
  library = [],
  libraryLoading = false,
  count = 0,
  limit = 0,
  onAttach,
  onCreate,
}) {
  // null = not chosen yet: start on the library when it has fields to attach, else on "create".
  const [chosenMode, setChosenMode] = useState(null)
  const [search, setSearch] = useState('')
  // Field name = short internal name (code + duplicate check); field label = what users see.
  const [name, setName] = useState('')
  const [fieldLabel, setFieldLabel] = useState('')
  const [fieldType, setFieldType] = useState('text')
  const [optionsText, setOptionsText] = useState('')
  const [required, setRequired] = useState(false)
  // Optional settings (v1314): default value, min/max, allowed characters.
  const [settings, setSettings] = useState({})
  const [showSettings, setShowSettings] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const atLimit = limit > 0 && count >= limit
  const attachable = useMemo(() => library.filter((f) => !f.attached), [library])
  const mode = chosenMode ?? (libraryLoading || attachable.length > 0 ? 'existing' : 'create')
  const setMode = setChosenMode

  const filteredLibrary = useMemo(() => {
    const term = search.trim().toLowerCase()
    return term ? library.filter((f) => f.label.toLowerCase().includes(term)) : library
  }, [library, search])

  const exact = findExactFieldMatch(name, library) || (fieldLabel.trim() ? findExactFieldMatch(fieldLabel, library) : null)
  const similar = exact ? [] : findSimilarFields(fieldLabel.trim() || name, library)
  const options = optionsText.split(/\r?\n/).map((o) => o.trim()).filter(Boolean)
  const needsOptions = OPTION_FIELD_TYPES.includes(fieldType)
  // Text-like fields can be limited to a list: entering dropdown values turns them into a
  // Dropdown (or a Multi-select dropdown for a multi-value list).
  const canLimitToList = ['text', 'long_text', 'multi_line'].includes(fieldType)
  const effectiveType = canLimitToList && options.length > 0
    ? (fieldType === 'multi_line' ? 'multi_select' : 'dropdown')
    : fieldType
  const settingsErrors = customFieldSettingsErrors(effectiveType, settings, options)
  const settingsCount = Object.values(settings).filter((v) => v !== undefined && v !== '' && v !== 'any' && !(Array.isArray(v) && !v.length)).length
  const canCreate = !busy && !atLimit && name.trim().length >= 2 && !exact && (!needsOptions || options.length > 0) && settingsErrors.length === 0

  const attach = async (definitionId) => {
    setBusy(true)
    setError('')
    const result = await onAttach(definitionId)
    setBusy(false)
    if (!result?.success) setError(result?.error || 'Could not add the field')
  }

  const create = async () => {
    setBusy(true)
    setError('')
    const result = await onCreate({ name: name.trim(), label: fieldLabel.trim() || name.trim(), fieldType: effectiveType, options, required, rules: settings })
    setBusy(false)
    if (result?.status === 'duplicate') {
      setError(`A field called “${result.existing?.label}” already exists in your organisation. Use it from the list instead.`)
      setMode('existing')
      setSearch(result.existing?.label || '')
      return
    }
    if (!result?.success) setError(result?.error || 'Could not create the field')
  }

  const tabClass = (active) =>
    `px-3 py-2 text-sm font-medium border-b-2 ${
      active
        ? 'border-blue-600 text-gray-900 dark:border-blue-300 dark:text-gray-100'
        : 'border-transparent text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-gray-100'
    }`

  return (
    <section
      aria-labelledby="add-custom-field-heading"
      className="md:col-span-2 rounded-lg border border-blue-200 dark:border-blue-900 bg-blue-50/40 dark:bg-gray-900/40 p-4 space-y-4"
    >
      <div className="flex items-start justify-between gap-3">
        <h3 id="add-custom-field-heading" className="text-base font-semibold text-gray-900 dark:text-gray-100">Add custom field</h3>
        <button
          type="button"
          onClick={onClose}
          disabled={busy}
          aria-label="Close add custom field"
          title="Close"
          className="rounded p-1 text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="space-y-4">
        <p className="text-sm text-gray-600 dark:text-gray-300">
          Custom fields are shared with everyone in your organisation. Check whether the field already exists before creating a new one.
        </p>

        {atLimit && (
          <p className="text-sm rounded-lg px-3 py-2 bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-200">
            Your organisation has reached its limit of {limit} custom fields for {registerLabel}. Ask a PMO admin to retire one, or your system administrator to raise the limit.
          </p>
        )}

        <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700" role="tablist" aria-label="Add custom field">
          <button type="button" role="tab" aria-selected={mode === 'existing'} className={tabClass(mode === 'existing')} onClick={() => setMode('existing')}>
            Use an existing field
          </button>
          <button type="button" role="tab" aria-selected={mode === 'create'} className={tabClass(mode === 'create')} onClick={() => setMode('create')}>
            Create a new field
          </button>
        </div>

        {mode === 'existing' ? (
          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search your organisation's custom fields…"
                aria-label="Search custom fields"
                className={`${INPUT_CLASS} pl-9`}
              />
            </div>
            {libraryLoading ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">Loading…</p>
            ) : filteredLibrary.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {library.length === 0 ? 'Your organisation has no custom fields yet.' : 'No fields match your search.'}{' '}
                <button type="button" className="text-blue-600 dark:text-blue-400 hover:underline" onClick={() => { setMode('create'); setName(search) }}>
                  Create a new field
                </button>
              </p>
            ) : (
              <ul className="divide-y divide-gray-200 dark:divide-gray-700 border border-gray-200 dark:border-gray-700 rounded-lg max-h-72 overflow-y-auto">
                {filteredLibrary.map((f) => (
                  <li key={f.id} className="flex items-center justify-between gap-3 px-3 py-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{f.label}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {fieldTypeLabel(f.field_type)} · used on {f.used_in || 0} register{Number(f.used_in) === 1 ? '' : 's'}
                      </p>
                    </div>
                    {f.attached ? (
                      <span className="text-xs text-green-700 dark:text-green-300 shrink-0">On this register</span>
                    ) : (
                      <Button type="button" size="sm" onClick={() => attach(f.id)} disabled={busy || atLimit}>
                        Add to this register
                      </Button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <div>
              <label htmlFor="cf-name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Field name *</label>
              <input id="cf-name" type="text" value={name} maxLength={80} onChange={(e) => setName(e.target.value)} className={INPUT_CLASS} />
              <label htmlFor="cf-label" className="mt-3 block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Field label</label>
              <input id="cf-label" type="text" value={fieldLabel} maxLength={120} placeholder={name.trim() || 'Same as the field name'}
                onChange={(e) => setFieldLabel(e.target.value)} className={INPUT_CLASS} />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Shown on forms, lists and exports. Leave blank to use the field name.</p>
              {exact && (
                <div className="mt-2 text-sm rounded-lg px-3 py-2 bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200">
                  A field called “{exact.label}” already exists in your organisation.{' '}
                  {exact.attached ? (
                    'It is already on this register.'
                  ) : (
                    <button type="button" className="font-medium underline" onClick={() => attach(exact.id)} disabled={busy || atLimit}>
                      Add it to this register
                    </button>
                  )}
                </div>
              )}
              {similar.length > 0 && (
                <div className="mt-2 text-sm rounded-lg px-3 py-2 bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-200">
                  Did you mean{' '}
                  {similar.map((f, i) => (
                    <span key={f.id}>
                      {i > 0 && ', '}
                      {f.attached ? (
                        <strong>“{f.label}” (already on this register)</strong>
                      ) : (
                        <button type="button" className="font-medium underline" onClick={() => attach(f.id)} disabled={busy || atLimit}>
                          “{f.label}”
                        </button>
                      )}
                    </span>
                  ))}
                  ? You can still create a new field if it is different.
                </div>
              )}
            </div>

            <div>
              <label htmlFor="cf-type" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Type *</label>
              <select
                id="cf-type"
                value={fieldType}
                onChange={(e) => { setFieldType(e.target.value); setSettings({}) }}
                className={INPUT_CLASS}
              >
                {CUSTOM_FIELD_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>

            {(needsOptions || canLimitToList) && (
              <div>
                <label htmlFor="cf-options" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {needsOptions ? 'Dropdown values *' : 'Dropdown values (optional)'}
                </label>
                <MultiLineListInput
                  viewModeId="register-custom-field-dropdown-values"
                  id="cf-options"
                  value={optionsText}
                  onChange={setOptionsText}
                  placeholder="Type a value and press Enter"
                  ariaLabelPrefix="dropdown value"
                  itemColumnLabel="Dropdown value"
                />
                {new Set(options.map((o) => o.toLowerCase())).size < options.length && (
                  <p className="mt-1 text-xs text-amber-700 dark:text-amber-300">Duplicate values will be merged into one.</p>
                )}
                {canLimitToList && (
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    {options.length > 0
                      ? `Users will pick from these ${options.length} value${options.length === 1 ? '' : 's'} — the field is created as a ${effectiveType === 'multi_select' ? 'Multi-select dropdown' : 'Dropdown'}.`
                      : 'Leave empty for free typing, or list values to limit what users can capture.'}
                  </p>
                )}
              </div>
            )}

            <label className="flex items-start gap-2">
              <input type="checkbox" checked={required} onChange={(e) => setRequired(e.target.checked)} className="mt-1" />
              <span className="text-sm text-gray-700 dark:text-gray-300">
                Required
                <span className="block text-xs text-gray-500 dark:text-gray-400">
                  Every record in this register will need a value before it can be saved.
                </span>
              </span>
            </label>

            <div className="rounded-lg border border-gray-200 dark:border-gray-700">
              <button
                type="button"
                onClick={() => setShowSettings((v) => !v)}
                aria-expanded={showSettings}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm font-medium text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800"
              >
                {showSettings ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                More options (optional)
                <span className="text-xs font-normal text-gray-500 dark:text-gray-400">
                  {settingsCount > 0 ? `${settingsCount} set` : 'default value, minimum and maximum, allowed characters'}
                </span>
              </button>
              {showSettings && (
                <div className="border-t border-gray-200 dark:border-gray-700 p-3">
                  <CustomFieldSettingsFields fieldType={effectiveType} options={options} settings={settings} onChange={setSettings} />
                </div>
              )}
            </div>
            {settingsErrors.length > 0 && (
              <ul className="list-disc pl-5 text-sm text-red-600 dark:text-red-400">
                {settingsErrors.map((m) => <li key={m}>{m}</li>)}
              </ul>
            )}
          </div>
        )}

        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
      </div>
      <div className="flex justify-end gap-2 border-t border-gray-200 dark:border-gray-700 pt-3">
        {mode === 'create' ? (
          <>
            <Button type="button" variant="secondary" onClick={onClose} disabled={busy}>Cancel</Button>
            <Button type="button" onClick={create} disabled={!canCreate}>{busy ? 'Creating…' : 'Create field'}</Button>
          </>
        ) : (
          <Button type="button" variant="secondary" onClick={onClose} disabled={busy}>Close</Button>
        )}
      </div>
    </section>
  )
}
