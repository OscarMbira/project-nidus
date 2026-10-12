/**
 * Approval Chain Templates (v982 Phase 2 — PMO Configuration Zone)
 * Reusable, named, ordered approval chains a PMO Admin defines once and can reference from a
 * template's governance profile (see the Governance tab on Industry Templates).
 * Route: /platform/pmo-admin/approval-chains
 */
import { useState, useEffect, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { GitBranch, Plus, ArrowLeft, Save, X, Trash2 } from 'lucide-react'
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
  getApprovalChainTemplates,
  getApprovalChainTemplateById,
  createApprovalChainTemplate,
  updateApprovalChainTemplate,
  deleteApprovalChainTemplate,
} from '../../services/organisationApprovalChainService'

const EMPTY_STEP = () => ({ role_name: '', role_label: '', approval_level: 1, is_mandatory: true })
const EMPTY_FORM = { chain_name: '', description: '', is_active: true, steps: [EMPTY_STEP()] }

export default function OrganisationApprovalChains() {
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
    const res = await getApprovalChainTemplates(access.accountId)
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
    () => [...rows].sort((a, b) => String(a.chain_name || '').localeCompare(String(b.chain_name || ''), undefined, { sensitivity: 'base' })),
    [rows],
  )

  const openCreate = () => { setEditing(null); setForm(EMPTY_FORM); setFormTab('details'); setShowForm(true) }
  const openEdit = async (row) => {
    const res = await getApprovalChainTemplateById(row.id)
    const full = res.success ? res.data : row
    setEditing(full)
    setForm({
      chain_name: full.chain_name || '', description: full.description || '', is_active: full.is_active !== false,
      steps: (full.steps && full.steps.length > 0) ? full.steps.map((s) => ({ ...s })) : [EMPTY_STEP()],
    })
    setFormTab('details')
    setShowForm(true)
  }
  const closeForm = () => { setShowForm(false); setEditing(null); setForm(EMPTY_FORM) }

  const handleDelete = async (row) => {
    if (!window.confirm(`Delete approval chain "${row.chain_name}"? This cannot be undone.`)) return
    const result = await deleteApprovalChainTemplate(row.id)
    if (!result.success) { setError(result.error); return }
    showSuccess({ recordId: row.chain_name, operation: 'deleted', message: `"${row.chain_name}" was deleted.` })
    load()
  }

  const updateStep = (index, field, value) => {
    setForm((f) => ({ ...f, steps: f.steps.map((s, i) => (i === index ? { ...s, [field]: value } : s)) }))
  }
  const addStep = () => setForm((f) => ({ ...f, steps: [...f.steps, EMPTY_STEP()] }))
  const removeStep = (index) => setForm((f) => ({ ...f, steps: f.steps.filter((_, i) => i !== index) }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.chain_name.trim()) { setError('Chain name is required'); return }
    setSaving(true)
    setError(null)
    const payload = { ...form, account_id: accountId }
    const result = editing ? await updateApprovalChainTemplate(editing.id, payload) : await createApprovalChainTemplate(payload)
    setSaving(false)
    if (!result.success) { setError(result.error); return }
    showSuccess({ recordId: result.data.chain_name, operation: editing ? 'updated' : 'created', message: `"${result.data.chain_name}" was ${editing ? 'updated' : 'created'} successfully.` })
    closeForm()
    load()
  }

  if (loading) return <div className="flex items-center justify-center min-h-[40vh] text-gray-500 dark:text-gray-400">Loading approval chain templates…</div>

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <GitBranch className="h-6 w-6 text-blue-600 dark:text-blue-400" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Approval Chain Templates</h1>
            <p className="text-sm text-gray-600 dark:text-gray-400">Reusable, ordered approval chains for template governance</p>
          </div>
        </div>
        {canManage && (
          <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            <Plus className="h-4 w-4" /> Add Chain
          </button>
        )}
      </div>

      {error && <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-800 dark:text-red-200">{error}</div>}

      {showForm && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{editing ? 'Edit Approval Chain' : 'Add Approval Chain'}</h2>
          <DetailAuditTabList activeTab={formTab} onChange={setFormTab} />
          {formTab === 'audit' ? (
            <div className="mt-4">
              {!editing ? (
                <p className="text-sm text-gray-500 dark:text-gray-400">Audit details appear after this chain is saved.</p>
              ) : (
                <AuditDetailsPanel description="Who created or changed this approval chain.">
                  <AuditCard title="Identity" description="How this chain is labelled.">
                    <AuditField label="Name" value={editing.chain_name} />
                    <AuditField label="Steps" value={String((editing.steps || []).length)} />
                  </AuditCard>
                  <AuditCard title="Classification" description="Status.">
                    <AuditField label="Active" value={editing.is_active ? 'Yes' : 'No'} />
                  </AuditCard>
                  <AuditCard title="Record history" description="When this chain was created and last changed.">
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
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Chain name *</label>
                <input type="text" value={form.chain_name} onChange={(e) => setForm((f) => ({ ...f, chain_name: e.target.value }))} required placeholder="e.g. Standard 3-Level Sign-off" className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Description</label>
                <textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} rows={2} className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white" />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Steps (in order)</label>
                  <button type="button" onClick={addStep} className="text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1">
                    <Plus className="h-3.5 w-3.5" /> Add step
                  </button>
                </div>
                <div className="space-y-2">
                  {form.steps.map((step, index) => (
                    <div key={index} className="flex flex-wrap items-center gap-2 p-3 border border-gray-200 dark:border-gray-700 rounded-lg">
                      <span className="text-xs text-gray-500 dark:text-gray-400 w-6">{index + 1}.</span>
                      <input type="text" value={step.role_name} onChange={(e) => updateStep(index, 'role_name', e.target.value)} placeholder="Role name (e.g. project_manager)" className="flex-1 min-w-[160px] px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded text-sm dark:bg-gray-700 dark:text-white" />
                      <input type="text" value={step.role_label || ''} onChange={(e) => updateStep(index, 'role_label', e.target.value)} placeholder="Display label (optional)" className="flex-1 min-w-[160px] px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded text-sm dark:bg-gray-700 dark:text-white" />
                      <input type="number" min={1} value={step.approval_level} onChange={(e) => updateStep(index, 'approval_level', e.target.value)} className="w-20 px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded text-sm dark:bg-gray-700 dark:text-white" title="Approval level" />
                      <label className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-400">
                        <input type="checkbox" checked={step.is_mandatory !== false} onChange={(e) => updateStep(index, 'is_mandatory', e.target.checked)} className="rounded border-gray-300 dark:border-gray-600" />
                        Mandatory
                      </label>
                      <button type="button" onClick={() => removeStep(index)} className="text-red-500 hover:text-red-600 p-1" title="Remove step">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
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
          <div className="p-8 text-center text-gray-500 dark:text-gray-400">No approval chain templates defined yet.</div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-900/40">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">#</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Name</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Description</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {sorted.map((row, index) => (
                <tr key={row.id}>
                  <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400 tabular-nums">{getDisplayRowNumber(index)}</td>
                  <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">{row.chain_name}</td>
                  <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">{row.description || '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 text-xs rounded-full ${row.is_active ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'}`}>
                      {row.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      {canManage && (<>
                        <RowActionButton variant="edit" label="Edit approval chain" onClick={() => openEdit(row)} />
                        <RowActionButton variant="delete" label="Delete approval chain" onClick={() => handleDelete(row)} />
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
