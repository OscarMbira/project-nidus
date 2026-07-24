import { useState, useEffect, useMemo } from 'react'
import { X, Loader, AlertTriangle } from 'lucide-react'
import {
  getSimAssignablePracticeMembers,
  getSimTeamFunctionalRoles,
  getSimUserTotalTeamAllocation,
  addSimTeamMember,
} from '../../services/sim/simTeamService'
import { useToast } from '../../hooks/useToast'

export default function SimAddTeamMemberModal({ isOpen, onClose, practiceTeamId, practiceProjectId, onSuccess }) {
  const { showToast } = useToast()
  const [loading, setLoading] = useState(true)
  const [assignable, setAssignable] = useState([])
  const [roles, setRoles] = useState([])
  const [search, setSearch] = useState('')
  const [selectedUserId, setSelectedUserId] = useState('')
  const [roleMode, setRoleMode] = useState('preset')
  const [presetRole, setPresetRole] = useState('')
  const [customRole, setCustomRole] = useState('')
  const [allocation, setAllocation] = useState(80)
  const [allocWarning, setAllocWarning] = useState(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!isOpen || !practiceTeamId || !practiceProjectId) return
    let cancelled = false
    ;(async () => {
      setLoading(true)
      const [a, r] = await Promise.all([
        getSimAssignablePracticeMembers(practiceProjectId, practiceTeamId),
        getSimTeamFunctionalRoles(practiceTeamId),
      ])
      if (cancelled) return
      if (a.success) setAssignable(a.data || [])
      if (r.success) {
        const list = r.data || []
        setRoles(list)
        const dev = list.find((x) => x.role_label === 'Developer')
        setPresetRole(dev?.role_label || list[0]?.role_label || '')
      }
      setLoading(false)
    })()
    return () => {
      cancelled = true
    }
  }, [isOpen, practiceTeamId, practiceProjectId])

  useEffect(() => {
    if (!isOpen) {
      setSearch('')
      setSelectedUserId('')
      setCustomRole('')
      setAllocWarning(null)
    }
  }, [isOpen])

  useEffect(() => {
    if (!selectedUserId) {
      setAllocWarning(null)
      return
    }
    ;(async () => {
      const res = await getSimUserTotalTeamAllocation(selectedUserId)
      if (res.success && res.total >= 100) {
        setAllocWarning('This user is already at 100% allocation across other practice teams.')
      } else if (res.success && res.total > 0) {
        setAllocWarning(`Current allocation on other teams: ${res.total}%.`)
      } else setAllocWarning(null)
    })()
  }, [selectedUserId])

  const filtered = useMemo(() => {
    const t = search.trim().toLowerCase()
    if (!t) return assignable
    return assignable.filter((row) => {
      const u = row.profile
      const name = (u?.full_name || u?.email || '').toLowerCase()
      const email = (u?.email || '').toLowerCase()
      return name.includes(t) || email.includes(t)
    })
  }, [assignable, search])

  const resolvedRole = roleMode === 'custom' ? customRole.trim() : presetRole

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!selectedUserId || !resolvedRole) {
      showToast('error', 'Select a member and functional role')
      return
    }
    const pct = Math.min(100, Math.max(0, Number(allocation) || 0))
    setSaving(true)
    try {
      const res = await addSimTeamMember(practiceTeamId, selectedUserId, resolvedRole, pct)
      if (res.success) {
        showToast('success', 'Member added to practice team')
        onSuccess?.()
        onClose()
      } else showToast('error', res.error || 'Failed to add member')
    } finally {
      setSaving(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="fixed inset-0 bg-black/60" onClick={onClose} aria-hidden="true" />
      <div className="relative bg-white dark:bg-gray-900 rounded-lg shadow-xl max-w-lg w-full p-6 border border-gray-200 dark:border-gray-700 my-8">
        <div className="flex justify-between items-start mb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Add practice team member</h2>
          <button type="button" onClick={onClose} className="text-gray-500 hover:text-gray-200">
            <X className="w-5 h-5" />
          </button>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">Only users already on the practice project can be added.</p>

        {loading ? (
          <div className="flex justify-center py-8">
            <Loader className="w-8 h-8 animate-spin text-blue-500" />
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Search</label>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-gray-900 dark:text-white"
                placeholder="Name or email…"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Practice project member</label>
              <select
                required
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-gray-900 dark:text-white"
              >
                <option value="">Select…</option>
                {filtered.map((row) => {
                  const u = row.profile
                  const label = `${u?.full_name || u?.email || 'User'} — Practice member`
                  return (
                    <option key={row.user_id} value={row.user_id}>
                      {label}
                    </option>
                  )
                })}
              </select>
            </div>

            {allocWarning && (
              <div className="flex gap-2 text-amber-700 dark:text-amber-300 text-sm bg-amber-50 dark:bg-amber-900/20 rounded-lg p-3">
                <AlertTriangle className="w-5 h-5 shrink-0" />
                <span>{allocWarning}</span>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Functional role</label>
              <div className="flex gap-2 mb-2">
                <button
                  type="button"
                  onClick={() => setRoleMode('preset')}
                  className={`text-xs px-2 py-1 rounded ${roleMode === 'preset' ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-gray-700'}`}
                >
                  Preset
                </button>
                <button
                  type="button"
                  onClick={() => setRoleMode('custom')}
                  className={`text-xs px-2 py-1 rounded ${roleMode === 'custom' ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-gray-700'}`}
                >
                  Other (custom)
                </button>
              </div>
              {roleMode === 'preset' ? (
                <select
                  value={presetRole}
                  onChange={(e) => setPresetRole(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2"
                >
                  {roles.map((r) => (
                    <option key={r.id} value={r.role_label}>
                      {r.role_label}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  value={customRole}
                  onChange={(e) => setCustomRole(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2"
                  placeholder="Custom label"
                />
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Allocation % (0–100)</label>
              <input
                type="number"
                min={0}
                max={100}
                value={allocation}
                onChange={(e) => setAllocation(e.target.value)}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600">
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving || !selectedUserId}
                className="px-4 py-2 rounded-lg bg-blue-600 text-white disabled:opacity-50"
              >
                {saving ? <Loader className="w-4 h-4 animate-spin" /> : 'Add to team'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
