import { useState, useEffect, useCallback } from 'react'
import { X, Loader, Search } from 'lucide-react'
import { searchUsersForSimInvite } from '../../services/sim/simProjectMembershipService'

export default function SimAddMemberModal({ isOpen, onClose, assignableRoles, onAdd }) {
  const [q, setQ] = useState('')
  const [results, setResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [selected, setSelected] = useState(null)
  const [roleName, setRoleName] = useState('team_member')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!isOpen) {
      setQ('')
      setResults([])
      setSelected(null)
      setRoleName('team_member')
    }
  }, [isOpen])

  const runSearch = useCallback(async () => {
    setSearching(true)
    try {
      const res = await searchUsersForSimInvite(q)
      if (res.success) setResults(res.data || [])
    } finally {
      setSearching(false)
    }
  }, [q])

  useEffect(() => {
    if (!isOpen) return
    const t = setTimeout(() => {
      if (q.trim().length >= 2) runSearch()
      else setResults([])
    }, 300)
    return () => clearTimeout(t)
  }, [q, isOpen, runSearch])

  if (!isOpen) return null

  const handleAdd = async () => {
    if (!selected?.auth_user_id) return
    setSaving(true)
    try {
      await onAdd(selected.auth_user_id, roleName)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="fixed inset-0 bg-black/60" onClick={onClose} aria-hidden="true" />
        <div className="relative bg-white dark:bg-gray-900 rounded-lg shadow-xl max-w-lg w-full p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex justify-between items-start mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Add member</h2>
            <button type="button" onClick={onClose} className="text-gray-500 hover:text-gray-800 dark:hover:text-gray-200">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search user by email (min 2 characters)"
              className="w-full pl-10 pr-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            />
          </div>
          {searching && <p className="text-xs text-gray-500 mb-2">Searching…</p>}
          <ul className="max-h-40 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg mb-4 divide-y divide-gray-200 dark:divide-gray-700">
            {results.map((u) => (
              <li key={u.id}>
                <button
                  type="button"
                  onClick={() => setSelected(u)}
                  className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-800 ${
                    selected?.id === u.id ? 'bg-blue-50 dark:bg-blue-900/30' : ''
                  }`}
                >
                  <span className="text-gray-900 dark:text-white">{u.full_name || u.email}</span>
                  <span className="block text-xs text-gray-500">{u.email}</span>
                </button>
              </li>
            ))}
            {q.length >= 2 && !searching && results.length === 0 && (
              <li className="px-3 py-2 text-sm text-gray-500">No matches</li>
            )}
          </ul>

          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Role</label>
          <select
            value={roleName}
            onChange={(e) => setRoleName(e.target.value)}
            className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-3 py-2 mb-4"
          >
            {assignableRoles.map((r) => (
              <option key={r.role_name} value={r.role_name}>
                {r.role_display_name}
              </option>
            ))}
          </select>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleAdd}
              disabled={saving || !selected}
              className="inline-flex items-center px-4 py-2 rounded-lg bg-violet-600 text-white hover:bg-violet-700 disabled:opacity-50"
            >
              {saving ? <Loader className="w-4 h-4 animate-spin" /> : 'Add'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
