/**
 * AddRegisterCustomFieldDialog (v1311) — add an organisation custom field to a register.
 * Step 1 shows the organisation's existing custom fields so users attach instead of duplicating
 * (PRD D12); step 2 creates a new field. Exact-name duplicates are blocked (and the server
 * re-checks), similar names get "Did you mean …?". Data access is passed in as callbacks so
 * Platform and Simulator bind their own services.
 */
import { useMemo, useState } from 'react'
import { Search } from 'lucide-react'
import Modal from './Modal'
import Button from './Button'
import {
  CUSTOM_FIELD_TYPES,
  OPTION_FIELD_TYPES,
  fieldTypeLabel,
  findExactFieldMatch,
  findSimilarFields,
} from '@nidus/shared/utils/registerCustomFields'

const INPUT_CLASS =
  'w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm'

/** Mounted only while open, so every opening starts with an empty form. */
export default function AddRegisterCustomFieldDialog(props) {
  return props.isOpen ? <AddRegisterCustomFieldDialogContent {...props} /> : null
}

function AddRegisterCustomFieldDialogContent({
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
  const [label, setLabel] = useState('')
  const [fieldType, setFieldType] = useState('text')
  const [optionsText, setOptionsText] = useState('')
  const [required, setRequired] = useState(false)
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

  const exact = findExactFieldMatch(label, library)
  const similar = exact ? [] : findSimilarFields(label, library)
  const options = optionsText.split(/\r?\n/).map((o) => o.trim()).filter(Boolean)
  const needsOptions = OPTION_FIELD_TYPES.includes(fieldType)
  const canCreate = !busy && !atLimit && label.trim().length >= 2 && !exact && (!needsOptions || options.length > 0)

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
    const result = await onCreate({ label: label.trim(), fieldType, options, required })
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
    <Modal
      isOpen
      onClose={() => !busy && onClose()}
      title="Add custom field"
      size="lg"
      footer={
        mode === 'create' ? (
          <>
            <Button type="button" variant="secondary" onClick={onClose} disabled={busy}>Cancel</Button>
            <Button type="button" onClick={create} disabled={!canCreate}>{busy ? 'Creating…' : 'Create field'}</Button>
          </>
        ) : (
          <Button type="button" variant="secondary" onClick={onClose} disabled={busy}>Close</Button>
        )
      }
    >
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
                <button type="button" className="text-blue-600 dark:text-blue-400 hover:underline" onClick={() => { setMode('create'); setLabel(search) }}>
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
              <input id="cf-name" type="text" value={label} maxLength={120} onChange={(e) => setLabel(e.target.value)} className={INPUT_CLASS} />
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
              <select id="cf-type" value={fieldType} onChange={(e) => setFieldType(e.target.value)} className={INPUT_CLASS}>
                {CUSTOM_FIELD_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>

            {needsOptions && (
              <div>
                <label htmlFor="cf-options" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Options * (one per line)</label>
                <textarea id="cf-options" value={optionsText} onChange={(e) => setOptionsText(e.target.value)} rows={4} className={INPUT_CLASS} />
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
          </div>
        )}

        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
      </div>
    </Modal>
  )
}
