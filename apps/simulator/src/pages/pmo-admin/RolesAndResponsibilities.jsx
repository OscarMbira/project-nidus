/**
 * Roles & Responsibilities (v982 Phase 2 — PMO Configuration Zone)
 * Landing page linking to the existing Custom Roles admin, plus default RACI CRUD
 * (public.pmo_role_responsibilities).
 * Route: /simulator/pmo/roles-responsibilities
 */
import { useState, useEffect, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Users, Plus, ArrowLeft, Save, X, Shield } from 'lucide-react'
import { useSuccessModal } from '@nidus/shared/hooks/useSuccessModal'
import { RowActionButton } from '@nidus/ui'
import DetailAuditTabList from '@nidus/ui/DetailAuditTabList'
import AuditDetailsPanel from '@nidus/ui/AuditDetailsPanel'
import AuditCard from '@nidus/ui/AuditCard'
import AuditField from '@nidus/ui/AuditField'
import AuditTimestampPair from '@nidus/ui/AuditTimestampPair'
import { resolveAuditUserLabels } from '@nidus/shared/utils/auditDisplayUtils'
import { platformDb } from '@nidus/supabase'
import { getDisplayRowNumber } from '@nidus/shared/utils/tableRowNumberUtils'
import {
  getPmoConfigAccess,
  getRoleResponsibilities,
  createRoleResponsibility,
  updateRoleResponsibility,
  deleteRoleResponsibility,
} from '../../services/organisationRaciService'

const RACI_LABELS = { R: 'Responsible', A: 'Accountable', C: 'Consulted', I: 'Informed' }
const EMPTY_FORM = { record_type: '', role_name: '', raci_code: 'R', notes: '', is_active: true }

export default function RolesAndResponsibilities() {
  const navigate = useNavigate()
  const { showSuccess, modal: successModal } = useSuccessModal()

  const [loading, setLoading] = useState(true)
  const [accountId, setAccountId] = useState(null)
  const [canManage, setCanManage] = useState(false)
  const [rows, setRows] = useState([])
  const [error, setError] = useState(null)

  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const [formTab, setFormTab] = useState('details')
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [auditUserLabels, setAuditUserLabels] = useState({})

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    const access = await getPmoConfigAccess()
    if (!access.success || !access.accountId) {
      setError(access.error || 'Could not resolve your organisation')
      setLoading(false)
      return
    }
    setAccountId(access.accountId)
    setCanManage(access.canManage)
    const res = await getRoleResponsibilities(access.accountId)
    if (res.success) setRows(res.data)
    else setError(res.error)
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    if (formTab !== 'audit' || !editing) return
    ;(async () => {
      const labels = await resolveAuditUserLabels(platformDb, [editing.created_by, editing.updated_by])
      setAuditUserLabels(labels)
    })()
  }, [formTab, editing])

  const sorted = useMemo(
    () => [...rows].sort((a, b) => String(a.record_type || '').localeCompare(String(b.record_type || '')) || String(a.role_name || '').localeCompare(String(b.role_name || ''))),
    [rows],
  )

  const openCreate = () => { setEditing(null); setForm(EMPTY_FORM); setFormTab('details'); setShowForm(true) }
  const openEdit = (row) => {
    setEditing(row)
    setForm({ record_type: row.record_type || '', role_name: row.role_name || '', raci_code: row.raci_code || 'R', notes: row.notes || '', is_active: row.is_active !== false })
    setFormTab('details')
    setShowForm(true)
  }
  const closeForm = () => { setShowForm(false); setEditing(null); setForm(EMPTY_FORM) }

  const handleDelete = async (row) => {
    if (!window.confirm(`Delete RACI entry for "${row.role_name}" on "${row.record_type}"?`)) return
    const result = await deleteRoleResponsibility(row.id)
    if (!result.success) { setError(result.error); return }
    showSuccess({ recordId: `${row.record_type}/${row.role_name}`, operation: 'deleted', message: 'RACI entry was deleted.' })
    load()
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.record_type.trim() || !form.role_name.trim()) { setError('Record type and role are required'); return }
    setSaving(true)
    setError(null)
    const payload = { ...form, account_id: accountId }
    const result = editing ? await updateRoleResponsibility(editing.id, payload) : await createRoleResponsibility(payload)
    setSaving(false)
    if (!result.success) { setError(result.error); return }
    showSuccess({ recordId: `${result.data.record_type}/${result.data.role_name}`, operation: editing ? 'updated' : 'created', message: `RACI entry was ${editing ? 'updated' : 'created'} successfully.` })
    closeForm()
    load()
  }

  if (loading) return <div className="flex items-center justify-center min-h-[40vh] text-gray-500 dark:text-gray-400">Loading roles &amp; responsibilities…</div>

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <Users className="h-6 w-6 text-blue-600 dark:text-blue-400" />
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Roles &amp; Responsibilities</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">Manage organisation roles and default RACI per record type</p>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Shield className="h-6 w-6 text-blue-600 dark:text-blue-400" />
          <div>
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">Manage Roles</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">Create and edit organisation-wide custom roles and their sidebar access</p>
          </div>
        </div>
        <button onClick={() => navigate('/simulator/pmo/manage-roles')} className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">
          Open Manage Roles →
        </button>
      </div>

      {error && <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-800 dark:text-red-200">{error}</div>}

      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Default RACI ({sorted.length})</h2>
        {canManage && (
          <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            <Plus className="h-4 w-4" /> Add RACI Entry
          </button>
        )}
      </div>

      {showForm && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{editing ? 'Edit RACI Entry' : 'Add RACI Entry'}</h2>
          <DetailAuditTabList activeTab={formTab} onChange={setFormTab} />
          {formTab === 'audit' ? (
            <div className="mt-4">
              {!editing ? (
                <p className="text-sm text-gray-500 dark:text-gray-400">Audit details appear after this entry is saved.</p>
              ) : (
                <AuditDetailsPanel description="Who created or changed this RACI entry.">
                  <AuditCard title="Identity" description="Record type and role.">
                    <AuditField label="Record type" value={editing.record_type} />
                    <AuditField label="Role" value={editing.role_name} />
                  </AuditCard>
                  <AuditCard title="Classification" description="RACI designation.">
                    <AuditField label="RACI" value={RACI_LABELS[editing.raci_code] || editing.raci_code} />
                    <AuditField label="Active" value={editing.is_active ? 'Yes' : 'No'} />
                  </AuditCard>
                  <AuditCard title="Record history" description="When this entry was created and last changed.">
                    <AuditField label="Created by" value={editing.created_by ? auditUserLabels[editing.created_by] || null : null} />
                    <AuditTimestampPair dateLabel="Created at" value={editing.created_at} />
                    <AuditField label="Updated by" value={editing.updated_by ? auditUserLabels[editing.updated_by] || null : null} />
                    <AuditTimestampPair dateLabel="Last updated" value={editing.updated_at} />
                  </AuditCard>
                </AuditDetailsPanel>
              )}
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Record type *</label>
                  <input type="text" value={form.record_type} onChange={(e) => setForm((f) => ({ ...f, record_type: e.target.value }))} required placeholder="e.g. risks, change_requests" className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Role *</label>
                  <input type="text" value={form.role_name} onChange={(e) => setForm((f) => ({ ...f, role_name: e.target.value }))} required placeholder="e.g. project_manager" className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">RACI</label>
                  <select value={form.raci_code} onChange={(e) => setForm((f) => ({ ...f, raci_code: e.target.value }))} className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white">
                    {Object.entries(RACI_LABELS).map(([code, label]) => <option key={code} value={code}>{code} — {label}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Notes</label>
                <textarea value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} rows={2} className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white" />
              </div>
              <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                <input type="checkbox" checked={form.is_active} onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))} className="rounded border-gray-300 dark:border-gray-600" />
                Active
              </label>
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={saving} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
                  <Save className="h-4 w-4" /> {saving ? 'Saving…' : editing ? 'Save Changes' : 'Create'}
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
          <div className="p-8 text-center text-gray-500 dark:text-gray-400">No RACI entries defined yet.</div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-900/40">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">#</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Record Type</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Role</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">RACI</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {sorted.map((row, index) => (
                <tr key={row.id}>
                  <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400 tabular-nums">{getDisplayRowNumber(index)}</td>
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{row.record_type}</td>
                  <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">{row.role_name}</td>
                  <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">{row.raci_code} — {RACI_LABELS[row.raci_code]}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 text-xs rounded-full ${row.is_active ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'}`}>
                      {row.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      {canManage && (<>
                        <RowActionButton variant="edit" label="Edit RACI entry" onClick={() => openEdit(row)} />
                        <RowActionButton variant="delete" label="Delete RACI entry" onClick={() => handleDelete(row)} />
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
