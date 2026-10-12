/**
 * Programme Members (v982 Phase 3 — Portfolio/Programme-Scoped Roles & Authority Model)
 * Mirrors PortfolioMembersPage.jsx exactly, substituting programme scope.
 * Route: /platform/programme/:programmeId/members
 */
import { useState, useEffect, useCallback, useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Users, Plus, ArrowLeft, Save, X } from 'lucide-react'
import { useSuccessModal } from '@nidus/shared/hooks/useSuccessModal'
import { RowActionButton } from '@nidus/ui'
import DetailAuditTabList from '@nidus/ui/DetailAuditTabList'
import AuditDetailsPanel from '@nidus/ui/AuditDetailsPanel'
import AuditCard from '@nidus/ui/AuditCard'
import AuditField from '@nidus/ui/AuditField'
import AuditTimestampPair from '@nidus/ui/AuditTimestampPair'
import { getDisplayRowNumber } from '@nidus/shared/utils/tableRowNumberUtils'
import { getProgramme } from '../../services/programmeService'
import {
  getProgrammeMembershipAccess,
  getProgrammeRoleTemplates,
  getProgrammeMembers,
  getGrantableUsersForProgramme,
  addProgrammeMember,
  updateProgrammeMemberRole,
  removeProgrammeMember,
} from '../../services/programmeRoleService'

export default function ProgrammeMembersPage() {
  const { programmeId } = useParams()
  const navigate = useNavigate()
  const { showSuccess, modal: successModal } = useSuccessModal()

  const [loading, setLoading] = useState(true)
  const [programme, setProgramme] = useState(null)
  const [canManage, setCanManage] = useState(false)
  const [members, setMembers] = useState([])
  const [roles, setRoles] = useState([])
  const [grantableUsers, setGrantableUsers] = useState([])
  const [error, setError] = useState(null)

  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const [formTab, setFormTab] = useState('details')
  const [form, setForm] = useState({ user_id: '', programme_role_id: '' })
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    const [programmeRes, accessRes, rolesRes, membersRes, usersRes] = await Promise.all([
      getProgramme(programmeId).catch(() => null),
      getProgrammeMembershipAccess(programmeId),
      getProgrammeRoleTemplates(),
      getProgrammeMembers(programmeId),
      getGrantableUsersForProgramme(),
    ])
    setProgramme(programmeRes)
    setCanManage(!!accessRes.canManage)
    if (rolesRes.success) setRoles(rolesRes.data)
    if (membersRes.success) setMembers(membersRes.data)
    else setError(membersRes.error)
    if (usersRes.success) setGrantableUsers(usersRes.data)
    setLoading(false)
  }, [programmeId])

  useEffect(() => { load() }, [load])

  const sorted = useMemo(
    () => [...members].sort((a, b) => String(a.user?.full_name || '').localeCompare(String(b.user?.full_name || ''))),
    [members],
  )

  const openCreate = () => { setEditing(null); setForm({ user_id: '', programme_role_id: '' }); setFormTab('details'); setShowForm(true) }
  const openEdit = (row) => {
    setEditing(row)
    setForm({ user_id: row.user_id, programme_role_id: row.programme_role_id })
    setFormTab('details')
    setShowForm(true)
  }
  const closeForm = () => { setShowForm(false); setEditing(null) }

  const handleRemove = async (row) => {
    if (!window.confirm(`Remove ${row.user?.full_name || 'this user'} from the programme?`)) return
    const result = await removeProgrammeMember(row.id)
    if (!result.success) { setError(result.error); return }
    showSuccess({ recordId: row.user?.full_name || row.id, operation: 'deleted', message: 'Programme member removed.' })
    load()
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.programme_role_id || (!editing && !form.user_id)) { setError('Select a user and a role'); return }
    setSaving(true)
    setError(null)
    const result = editing
      ? await updateProgrammeMemberRole(editing.id, form.programme_role_id)
      : await addProgrammeMember(programmeId, form.user_id, form.programme_role_id)
    setSaving(false)
    if (!result.success) { setError(result.error); return }
    showSuccess({ recordId: result.data.user?.full_name || result.data.id, operation: editing ? 'updated' : 'created', message: `Programme membership ${editing ? 'updated' : 'granted'} successfully.` })
    closeForm()
    load()
  }

  if (loading) return <div className="flex items-center justify-center min-h-[40vh] text-gray-500 dark:text-gray-400">Loading programme members…</div>

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <Users className="h-6 w-6 text-blue-600 dark:text-blue-400" />
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Programme Members{programme ? ` — ${programme.programme_name}` : ''}
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Explicit role grants — the only source of write authority on this programme (no automatic downward authority).
          </p>
        </div>
      </div>

      {error && <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-800 dark:text-red-200">{error}</div>}

      {!canManage && (
        <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg text-sm text-amber-800 dark:text-amber-200">
          You can view this programme's members, but only a Programme Manager, this programme's Portfolio Manager, the programme owner, or a PMO Admin of this organisation can grant or remove access.
        </div>
      )}

      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Members ({sorted.length})</h2>
        {canManage && (
          <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            <Plus className="h-4 w-4" /> Grant Access
          </button>
        )}
      </div>

      {showForm && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{editing ? 'Edit Role' : 'Grant Programme Access'}</h2>
          <DetailAuditTabList activeTab={formTab} onChange={setFormTab} />
          {formTab === 'audit' ? (
            <div className="mt-4">
              {!editing ? (
                <p className="text-sm text-gray-500 dark:text-gray-400">Audit details appear after this grant is saved.</p>
              ) : (
                <AuditDetailsPanel description="When this grant was made.">
                  <AuditCard title="Identity" description="Who holds this grant.">
                    <AuditField label="User" value={editing.user?.full_name} />
                    <AuditField label="Email" value={editing.user?.email} />
                  </AuditCard>
                  <AuditCard title="Classification" description="Role and status.">
                    <AuditField label="Role" value={editing.programme_role?.role_display_name} />
                    <AuditField label="Status" value={editing.is_active ? 'Active' : 'Inactive'} />
                  </AuditCard>
                  <AuditCard title="Record history" description="When this grant was created and last changed.">
                    <AuditTimestampPair dateLabel="Granted at" value={editing.created_at} />
                    <AuditTimestampPair dateLabel="Last updated" value={editing.updated_at} />
                  </AuditCard>
                </AuditDetailsPanel>
              )}
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">User *</label>
                  <select
                    value={form.user_id}
                    onChange={(e) => setForm((f) => ({ ...f, user_id: e.target.value }))}
                    disabled={!!editing}
                    required
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white disabled:opacity-60"
                  >
                    <option value="">Select a user…</option>
                    {grantableUsers.map((u) => (
                      <option key={u.id || u.user_id} value={u.id || u.user_id}>{u.full_name || u.email} ({u.email})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Role *</label>
                  <select
                    value={form.programme_role_id}
                    onChange={(e) => setForm((f) => ({ ...f, programme_role_id: e.target.value }))}
                    required
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                  >
                    <option value="">Select a role…</option>
                    {roles.map((r) => (
                      <option key={r.id} value={r.id}>{r.role_display_name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={saving} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
                  <Save className="h-4 w-4" /> {saving ? 'Saving…' : editing ? 'Save Changes' : 'Grant Access'}
                </button>
                <button type="button" onClick={closeForm} className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">
                  <X className="h-4 w-4" /> Cancel
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-x-auto">
        {sorted.length === 0 ? (
          <div className="p-8 text-center text-gray-500 dark:text-gray-400">No explicit members yet — no one has programme-level write authority here.</div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-900/40">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">#</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">User</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Role</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {sorted.map((row, index) => (
                <tr key={row.id}>
                  <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400 tabular-nums">{getDisplayRowNumber(index)}</td>
                  <td className="px-4 py-3">
                    <div className="text-sm font-medium text-gray-900 dark:text-white">{row.user?.full_name || '—'}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">{row.user?.email}</div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">{row.programme_role?.role_display_name}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      {canManage && (<>
                        <RowActionButton variant="edit" label="Change role" onClick={() => openEdit(row)} />
                        <RowActionButton variant="delete" label="Remove member" onClick={() => handleRemove(row)} />
                      </>)}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      {successModal}
    </div>
  )
}
