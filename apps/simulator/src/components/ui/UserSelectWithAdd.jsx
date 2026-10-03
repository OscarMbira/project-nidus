import { useState, useCallback, useMemo } from 'react'
import { UserPlus, X, Loader, Info } from 'lucide-react'
import SelectField from './SelectField.jsx'

/**
 * UserSelectWithAdd
 * A user dropdown that also lets the user add a named (non-registered) person inline.
 * Named contacts are persisted to the org's project_named_contacts table so they
 * appear again in future dropdowns.
 *
 * Uses SelectField (v1064) so long user lists become searchable automatically.
 */
export default function UserSelectWithAdd({
  fieldName,
  nameFieldName,
  value = '',
  nameValue = '',
  users = [],
  onChange,
  onAddUser,
  placeholder = 'Select person...',
  error,
  hint,
  mandateSuggestion,
}) {
  const [showAddForm, setShowAddForm] = useState(false)
  const [newName, setNewName] = useState('')
  const [newEmail, setNewEmail] = useState('')
  const [adding, setAdding] = useState(false)
  const [addError, setAddError] = useState('')

  const systemUsers = useMemo(() => users.filter((u) => !u.is_named_contact), [users])
  const namedContacts = useMemo(() => users.filter((u) => u.is_named_contact), [users])

  const currentSelectVal = (() => {
    if (value) return value
    if (nameValue) {
      const match = namedContacts.find((c) => c.full_name === nameValue)
      return match ? match.id : `nc_text_${nameValue}`
    }
    return ''
  })()

  const options = useMemo(() => {
    const opts = []
    if (!value && nameValue && !namedContacts.find((c) => c.full_name === nameValue)) {
      opts.push({ value: `nc_text_${nameValue}`, label: nameValue })
    }
    for (const u of systemUsers) {
      opts.push({
        value: u.id,
        label: u.full_name || u.email || u.id,
      })
    }
    for (const c of namedContacts) {
      opts.push({
        value: c.id,
        label: c.email ? `${c.full_name} (${c.email})` : c.full_name,
      })
    }
    return opts
  }, [value, nameValue, systemUsers, namedContacts])

  const handleSelectChange = useCallback(
    (selectedId) => {
      if (!selectedId) {
        onChange('', '')
        return
      }
      if (selectedId.startsWith('nc_text_')) {
        const nameFromValue = selectedId.slice('nc_text_'.length)
        onChange('', nameFromValue)
        return
      }
      if (selectedId.startsWith('nc_')) {
        const contact = users.find((u) => u.id === selectedId)
        onChange('', contact?.full_name || '')
      } else {
        const user = users.find((u) => u.id === selectedId)
        onChange(selectedId, user?.full_name || '')
      }
    },
    [users, onChange],
  )

  const handleAdd = useCallback(async () => {
    if (!newName.trim()) {
      setAddError('Name is required')
      return
    }
    setAdding(true)
    setAddError('')
    try {
      const added = await onAddUser(newName.trim(), newEmail.trim() || null)
      onChange('', added.full_name)
      setShowAddForm(false)
      setNewName('')
      setNewEmail('')
    } catch (err) {
      setAddError(err?.message || 'Failed to add person')
    } finally {
      setAdding(false)
    }
  }, [newName, newEmail, onAddUser, onChange])

  return (
    <div className="space-y-2">
      {mandateSuggestion && !value && !nameValue && (
        <div className="flex items-start gap-2 rounded-md border border-amber-500/40 bg-amber-50 dark:bg-amber-900/20 px-3 py-2 text-xs text-amber-800 dark:text-amber-300">
          <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
          <span>
            Mandate suggests: <strong>{mandateSuggestion}</strong> — select from the list below or add them as a new contact.
          </span>
        </div>
      )}

      <SelectField
        name={fieldName}
        options={options}
        value={currentSelectVal}
        onChange={handleSelectChange}
        placeholder={placeholder}
        searchPlaceholder="Search people..."
        className={
          error
            ? 'w-full rounded-lg border border-red-500 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white'
            : undefined
        }
      />
      {/* nameFieldName reserved for form wiring consumers */}
      {nameFieldName ? <input type="hidden" name={nameFieldName} value={nameValue || ''} readOnly /> : null}

      {error && <p className="text-sm text-red-500">{error}</p>}
      {hint && !error && (
        <p className="flex items-start gap-1 text-xs text-gray-500 dark:text-gray-400">
          <Info className="h-3 w-3 mt-0.5 shrink-0" />
          <span>{hint}</span>
        </p>
      )}

      {!showAddForm ? (
        <button
          type="button"
          onClick={() => setShowAddForm(true)}
          className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
        >
          <UserPlus className="h-3.5 w-3.5" />
          Person not listed? Add them
        </button>
      ) : (
        <div className="rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800/60 p-3 space-y-2">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-medium text-gray-700 dark:text-gray-300">Add New Person</span>
            <button
              type="button"
              onClick={() => {
                setShowAddForm(false)
                setAddError('')
                setNewName('')
                setNewEmail('')
              }}
              className="text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Full name *"
            className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
          />
          <input
            type="email"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            placeholder="Email address (optional)"
            className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
          />

          {addError && <p className="text-xs text-red-500 dark:text-red-400">{addError}</p>}

          <button
            type="button"
            onClick={handleAdd}
            disabled={adding || !newName.trim()}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-md transition-colors"
          >
            {adding ? <Loader className="h-3 w-3 animate-spin" /> : <UserPlus className="h-3 w-3" />}
            {adding ? 'Adding…' : 'Add & Select'}
          </button>
        </div>
      )}
    </div>
  )
}
