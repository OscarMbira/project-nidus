import { useState, useEffect } from 'react'
import { X, Loader } from 'lucide-react'
import { getSimTeamFunctionalRoles, updateSimTeamMember } from '../../services/sim/simTeamService'
import { useToast } from '../../hooks/useToast'

export default function SimEditTeamMemberModal({ isOpen, onClose, practiceTeamId, member, onSuccess }) {
  const { showToast } = useToast()
  const [roles, setRoles] = useState([])
  const [roleMode, setRoleMode] = useState('preset')
  const [presetRole, setPresetRole] = useState('')
  const [customRole, setCustomRole] = useState('')
  const [allocation, setAllocation] = useState(100)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!isOpen || !practiceTeamId || !member) return
    setAllocation(Number(member.allocation_percentage) || 0)
    const mr = member.member_role || ''
    setPresetRole(mr)
    setCustomRole(mr)
    if (mr) setRoleMode('preset')
    ;(async () => {
      setLoading(true)
      const r = await getSimTeamFunctionalRoles(practiceTeamId)
      if (r.success) {
        const list = r.data || []
        setRoles(list)
        const match = list.some((x) => x.role_label === mr)
        if (!match && mr) setRoleMode('custom')
      }
      setLoading(false)
    })()
  }, [isOpen, practiceTeamId, member])

  if (!isOpen || !member) return null

  const displayName = member.profile?.full_name || member.profile?.email || 'Member'
  const resolvedRole = roleMode === 'custom' ? customRole.trim() : presetRole

  const handleSave = async () => {
    if (!resolvedRole) {
      showToast('error', 'Functional role is required')
      return
    }
    const pct = Math.min(100, Math.max(0, Number(allocation) || 0))
    setSaving(true)
    try {
      const res = await updateSimTeamMember(member.id, resolvedRole, pct)
      if (res.success) {
        showToast('success', 'Member updated')
        onSuccess?.()
        onClose()
      } else showToast('error', res.error || 'Update failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/60" onClick={onClose} aria-hidden="true" />
      <div className="relative bg-white dark:bg-gray-900 rounded-lg shadow-xl max-w-md w-full p-6 border border-gray-200 dark:border-gray-700">
        <div className="flex justify-between items-start mb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Edit practice team member</h2>
          <button type="button" onClick={onClose} className="text-gray-500">
            <X className="w-5 h-5" />
          </button>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">{displayName}</p>

        {loading ? (
          <Loader className="w-8 h-8 animate-spin mx-auto text-blue-500" />
        ) : (
          <div className="space-y-4">
            <div className="flex gap-2">
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
                Custom
              </button>
            </div>
            {roleMode === 'preset' ? (
              <select
                value={presetRole}
                onChange={(e) => setPresetRole(e.target.value)}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2"
              >
                {roles.length === 0 && <option value="">No preset roles yet — use Custom</option>}
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
              />
            )}
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Allocation %</label>
              <input
                type="number"
                min={0}
                max={100}
                value={allocation}
                onChange={(e) => setAllocation(e.target.value)}
                className="w-full mt-1 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600">
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 rounded-lg bg-blue-600 text-white"
              >
                {saving ? <Loader className="w-4 h-4 animate-spin" /> : 'Save'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
