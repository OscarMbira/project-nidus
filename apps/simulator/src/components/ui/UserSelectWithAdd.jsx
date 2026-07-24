import { useState, useCallback } from 'react'
import { UserPlus, X, Loader } from 'lucide-react'
import { Info } from 'lucide-react'

/**
 * UserSelectWithAdd
 * A user dropdown that also lets the user add a named (non-registered) person inline.
 * Named contacts are persisted to the org's project_named_contacts table so they
 * appear again in future dropdowns.
 *
 * Props:
 *   fieldName        – name of the UUID form field (e.g. "funding_authority_user_id")
 *   nameFieldName    – name of the text fallback field  (e.g. "funding_authority_name")
 *   value            – current UUID value (or '' if none)
 *   nameValue        – current text-name value (or '' if none)
 *   users            – array of { id, full_name, email, is_named_contact? }
 *   onChange         – fn(userId, userName) called on selection change
 *   onAddUser        – async fn(fullName, email) → { id, full_name, email, is_named_contact }
 *   placeholder      – dropdown placeholder text
 *   error            – error string or null
 *   hint             – optional hint text shown below the select
 *   mandateSuggestion – optional string: name from mandate that is not yet in system
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

  // Determine the display value for the select:
  // named contacts have id prefixed 'nc_'; system users have UUID directly.
  const selectValue = value || (nameValue ? `nc_text_${nameValue}` : '')

  const handleSelectChange = useCallback((e) => {
    const selectedId = e.target.value
    if (!selectedId) {
      onChange('', '')
      return
    }
    // Synthetic text-only option (no named_contact record yet)
    if (selectedId.startsWith('nc_text_')) {
      const nameFromValue = selectedId.slice('nc_text_'.length)
      onChange('', nameFromValue)
      return
    }
    if (selectedId.startsWith('nc_')) {
      // Named contact — find in users list
      const contact = users.find(u => u.id === selectedId)
      onChange('', contact?.full_name || '')
    } else {
      // System user — store UUID, clear name
      const user = users.find(u => u.id === selectedId)
      onChange(selectedId, user?.full_name || '')
    }
  }, [users, onChange])

  const handleAdd = useCallback(async () => {
    if (!newName.trim()) {
      setAddError('Name is required')
      return
    }
    setAdding(true)
    setAddError('')
    try {
      const added = await onAddUser(newName.trim(), newEmail.trim() || null)
      // Auto-select the newly added contact (named contact → text field)
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

  const systemUsers = users.filter(u => !u.is_named_contact)
  const namedContacts = users.filter(u => u.is_named_contact)

  // Compute current select element value
  // - If a system user UUID is present, use it
  // - If we only have a text name (from mandate or manual prefill), try to match an existing
  //   named contact; if none exists yet, use a synthetic "nc_text_{name}" value so the
  //   dropdown shows the prefilled name as the selected option.
  const currentSelectVal = (() => {
    if (value) return value                          // system user UUID
    if (nameValue) {
      const match = namedContacts.find(c => c.full_name === nameValue)
      return match ? match.id : `nc_text_${nameValue}` // synthetic option for text-only contact
    }
    return ''
  })()

  return (
    <div className="space-y-2">
      {/* Mandate suggestion notice */}
      {mandateSuggestion && !value && !nameValue && (
        <div className="flex items-start gap-2 rounded-md border border-amber-500/40 bg-amber-900/20 px-3 py-2 text-xs text-amber-300">
          <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
          <span>
            Mandate suggests: <strong>{mandateSuggestion}</strong> — select from the list below or add them as a new contact.
          </span>
        </div>
      )}

      <select
        name={fieldName}
        value={currentSelectVal}
        onChange={handleSelectChange}
        className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white ${
          error ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
        }`}
      >
        <option value="">{placeholder}</option>

        {/* Ephemeral option for text-only prefill (e.g. mandate proposed executive) */}
        {!value && nameValue && !namedContacts.find(c => c.full_name === nameValue) && (
          <option value={`nc_text_${nameValue}`}>{nameValue}</option>
        )}

        {systemUsers.length > 0 && (
          <optgroup label="— Registered Users —">
            {systemUsers.map(u => (
              <option key={u.id} value={u.id}>
                {u.full_name || u.email}
              </option>
            ))}
          </optgroup>
        )}

        {namedContacts.length > 0 && (
          <optgroup label="— Named Contacts —">
            {namedContacts.map(c => (
              <option key={c.id} value={c.id}>
                {c.full_name}{c.email ? ` (${c.email})` : ''}
              </option>
            ))}
          </optgroup>
        )}
      </select>

      {error && <p className="text-sm text-red-500">{error}</p>}
      {hint && !error && (
        <p className="flex items-start gap-1 text-xs text-gray-500 dark:text-gray-400">
          <Info className="h-3 w-3 mt-0.5 shrink-0" />
          <span>{hint}</span>
        </p>
      )}

      {/* Add person toggle */}
      {!showAddForm ? (
        <button
          type="button"
          onClick={() => setShowAddForm(true)}
          className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 transition-colors"
        >
          <UserPlus className="h-3.5 w-3.5" />
          Person not listed? Add them
        </button>
      ) : (
        <div className="rounded-lg border border-gray-600 bg-gray-800/60 p-3 space-y-2">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-medium text-gray-300">Add New Person</span>
            <button
              type="button"
              onClick={() => { setShowAddForm(false); setAddError(''); setNewName(''); setNewEmail('') }}
              className="text-gray-400 hover:text-gray-200"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          <input
            type="text"
            value={newName}
            onChange={e => setNewName(e.target.value)}
            placeholder="Full name *"
            className="w-full px-3 py-1.5 text-sm border border-gray-600 rounded-md bg-gray-700 text-white placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
          />
          <input
            type="email"
            value={newEmail}
            onChange={e => setNewEmail(e.target.value)}
            placeholder="Email address (optional)"
            className="w-full px-3 py-1.5 text-sm border border-gray-600 rounded-md bg-gray-700 text-white placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
          />

          {addError && <p className="text-xs text-red-400">{addError}</p>}

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
