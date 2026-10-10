/**
 * Non-Conformance Register (taxonomy §3, Quality > Non-Conformance: Register/Corrective
 * Action/Preventive Action/Closure). Reuses the existing quality_defects table
 * (qualityManagementService.js) filtered to is_non_conformance = true — that table already had
 * full CRUD service functions (getQualityDefects/saveQualityDefect/deleteQualityDefect) but zero
 * frontend consumer anywhere in the app.
 */
import { useState, useEffect, useCallback, useMemo } from 'react'
import { AlertOctagon, Plus } from 'lucide-react'
import toast from 'react-hot-toast'
import { usePlatformProjectId } from '@nidus/shared/hooks/usePlatformProjectId.js'
import { RowActionButton } from '@nidus/ui'
import { TableRowNumberHeader, TableRowNumberCell } from '@nidus/ui/Table'
import { getDisplayRowNumber } from '@nidus/shared/utils/tableRowNumberUtils'
import DetailAuditTabList from '@nidus/ui/DetailAuditTabList'
import MultiLineListInput from '@nidus/ui/MultiLineListInput'
import AuditDetailsPanel from '@nidus/ui/AuditDetailsPanel'
import AuditCard from '@nidus/ui/AuditCard'
import AuditField from '@nidus/ui/AuditField'
import AuditTimestampPair from '@nidus/ui/AuditTimestampPair'
import { resolveAuditUserLabels } from '@nidus/shared/utils/auditDisplayUtils'
import { platformDb } from '@nidus/supabase'
import { getQualityDefects, saveQualityDefect, deleteQualityDefect } from '../../services/qualityManagementService'

const STATUS_COLORS = {
  open: 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-900/40 dark:text-amber-300 dark:border-amber-700',
  'in-progress': 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900/40 dark:text-blue-300 dark:border-blue-700',
  resolved: 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-900/40 dark:text-emerald-300 dark:border-emerald-700',
  verified: 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-900/40 dark:text-emerald-300 dark:border-emerald-700',
  closed: 'bg-gray-100 text-gray-700 border-gray-300 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600',
  deferred: 'bg-gray-100 text-gray-700 border-gray-300 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600',
  'wont-fix': 'bg-red-100 text-red-800 border-red-300 dark:bg-red-900/40 dark:text-red-300 dark:border-red-700',
}

const EMPTY_FORM = {
  defect_title: '', defect_description: '', affected_standard: '',
  root_cause_analysis: '', corrective_action: '', preventive_action: '',
  status: 'open',
}

const NC_FORM_TABS = [
  { value: 'details', label: 'Details' },
  { value: 'affected-standard', label: 'Affected standard' },
  { value: 'root-cause', label: 'Root cause analysis' },
  { value: 'corrective', label: 'Corrective action' },
  { value: 'preventive', label: 'Preventive action' },
  { value: 'audit', label: 'Audit details' },
]

export default function NonConformanceRegisterPage() {
  const { projectId } = usePlatformProjectId()
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [formOpen, setFormOpen] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [formTab, setFormTab] = useState('details')
  const [editingRow, setEditingRow] = useState(null)
  const [auditUserLabels, setAuditUserLabels] = useState({})

  const load = useCallback(async () => {
    if (!projectId) { setLoading(false); return }
    setLoading(true)
    try {
      const data = await getQualityDefects({ project_id: projectId })
      setRows((data || []).filter((d) => d.is_non_conformance))
    } catch (e) {
      toast.error(e?.message || 'Failed to load non-conformances')
    } finally {
      setLoading(false)
    }
  }, [projectId])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    if (formTab !== 'audit' || !editingRow) return
    let cancelled = false
    resolveAuditUserLabels(platformDb, [editingRow.created_by, editingRow.updated_by]).then((labels) => {
      if (!cancelled) setAuditUserLabels(labels || {})
    })
    return () => { cancelled = true }
  }, [formTab, editingRow])

  const handleListChange = (name) => (value) => setForm((prev) => ({ ...prev, [name]: value }))

  const openCreate = () => { setEditingId(null); setEditingRow(null); setFormTab('details'); setForm(EMPTY_FORM); setFormOpen(true) }
  const openEdit = (d) => {
    setEditingId(d.id)
    setEditingRow(d)
    setFormTab('details')
    setForm({
      defect_title: d.defect_title || '', defect_description: d.defect_description || '',
      affected_standard: d.affected_standard || '', root_cause_analysis: d.root_cause_analysis || '',
      corrective_action: d.corrective_action || '', preventive_action: d.preventive_action || '',
      status: d.status || 'open',
    })
    setFormOpen(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.defect_title.trim() || !form.defect_description.trim()) { toast.error('Title and description are required'); return }
    setSaving(true)
    try {
      const payload = { ...form, is_non_conformance: true, project_id: projectId }
      if (form.status === 'closed' && !editingId) payload.closure_date = new Date().toISOString().slice(0, 10)
      await saveQualityDefect(payload, editingId)
      toast.success(editingId ? 'Non-conformance updated' : 'Non-conformance logged')
      setFormOpen(false)
      await load()
    } catch (e2) {
      toast.error(e2?.message || 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (d) => {
    if (!window.confirm(`Delete "${d.defect_title}"?`)) return
    try {
      await deleteQualityDefect(d.id)
      setRows((prev) => prev.filter((x) => x.id !== d.id))
      toast.success('Deleted')
    } catch (e) {
      toast.error(e?.message || 'Delete failed')
    }
  }

  const openCount = useMemo(() => rows.filter((r) => r.status !== 'closed' && r.status !== 'wont-fix').length, [rows])

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 p-4 md:p-6">
      <div className="max-w-5xl mx-auto space-y-4">
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <h1 className="text-xl font-bold flex items-center gap-2">
              <AlertOctagon className="h-5 w-5 text-red-600 dark:text-red-400" /> Non-Conformance Register
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">{rows.length} logged · {openCount} open</p>
          </div>
          <button type="button" onClick={openCreate}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium">
            <Plus className="h-4 w-4" /> Log non-conformance
          </button>
        </div>

        {formOpen && (
          <form onSubmit={handleSubmit} className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 space-y-4">
            <DetailAuditTabList activeTab={formTab} onChange={setFormTab} tabs={NC_FORM_TABS} />

            {formTab === 'details' && (
              <div className="grid grid-cols-1 gap-3">
                <label htmlFor="nc-title" className="block text-sm font-medium text-gray-700 dark:text-gray-300 -mb-1">Title *</label>
                <input id="nc-title" placeholder="Title *" value={form.defect_title} onChange={(e) => setForm({ ...form, defect_title: e.target.value })}
                  className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-950 px-3 py-2 text-sm" />
                <label htmlFor="nc-description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 -mb-1">Description *</label>
                <textarea id="nc-description" placeholder="Description *" rows={2} value={form.defect_description} onChange={(e) => setForm({ ...form, defect_description: e.target.value })}
                  className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-950 px-3 py-2 text-sm" />
                <label htmlFor="nc-status" className="block text-sm font-medium text-gray-700 dark:text-gray-300 -mb-1">Status</label>
                <select id="nc-status" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}
                  className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-950 px-3 py-2 text-sm capitalize">
                  {['open', 'in-progress', 'resolved', 'verified', 'closed', 'deferred', 'wont-fix'].map((st) => (
                    <option key={st} value={st}>{st.replace('-', ' ')}</option>
                  ))}
                </select>
              </div>
            )}

            {formTab === 'affected-standard' && (
              <MultiLineListInput viewModeId="nc-affected-standard" id="nc-affected-standard" value={form.affected_standard}
                onChange={handleListChange('affected_standard')} placeholder="Add affected standard…"
                ariaLabelPrefix="affected standard" itemColumnLabel="Affected standard" />
            )}

            {formTab === 'root-cause' && (
              <MultiLineListInput viewModeId="nc-root-cause" id="nc-root-cause" value={form.root_cause_analysis}
                onChange={handleListChange('root_cause_analysis')} placeholder="Add root cause…"
                ariaLabelPrefix="root cause" itemColumnLabel="Root cause" />
            )}

            {formTab === 'corrective' && (
              <MultiLineListInput viewModeId="nc-corrective-action" id="nc-corrective-action" value={form.corrective_action}
                onChange={handleListChange('corrective_action')} placeholder="Add corrective action…"
                ariaLabelPrefix="corrective action" itemColumnLabel="Corrective action" />
            )}

            {formTab === 'preventive' && (
              <MultiLineListInput viewModeId="nc-preventive-action" id="nc-preventive-action" value={form.preventive_action}
                onChange={handleListChange('preventive_action')} placeholder="Add preventive action…"
                ariaLabelPrefix="preventive action" itemColumnLabel="Preventive action" />
            )}

            {formTab === 'audit' && (!editingRow ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">Audit details appear after this record is saved.</p>
            ) : (
              <AuditDetailsPanel description="Who created or changed this non-conformance, and its current status.">
                <AuditCard title="Identity" description="How this non-conformance is labelled.">
                  <AuditField label="Title" value={editingRow.defect_title} />
                  <AuditField label="Status" value={editingRow.status} />
                </AuditCard>
                <AuditCard title="Classification" description="The standard it affects.">
                  <AuditField label="Affected standard" value={editingRow.affected_standard} />
                </AuditCard>
                <AuditCard title="Record history" description="When this was created and last changed.">
                  <AuditField label="Created by" value={editingRow.created_by ? auditUserLabels[editingRow.created_by] || null : null} />
                  <AuditTimestampPair dateLabel="Created at" value={editingRow.created_at} />
                  <AuditField label="Updated by" value={editingRow.updated_by ? auditUserLabels[editingRow.updated_by] || null : null} />
                  <AuditTimestampPair dateLabel="Last updated" value={editingRow.updated_at} />
                </AuditCard>
              </AuditDetailsPanel>
            ))}

            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setFormOpen(false)} className="px-4 py-2 rounded-lg text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800">Cancel</button>
              <button type="submit" disabled={saving} className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium disabled:opacity-50">
                {editingId ? 'Save changes' : 'Log'}
              </button>
            </div>
          </form>
        )}

        {loading ? (
          <p className="text-gray-500 dark:text-gray-400">Loading…</p>
        ) : rows.length === 0 ? (
          <div className="text-center py-16 text-gray-500 dark:text-gray-400 rounded-xl border border-gray-200 dark:border-gray-800">
            <AlertOctagon className="h-10 w-10 mx-auto mb-3 opacity-40" />
            <p>No non-conformances logged yet.</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-800">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-100 dark:bg-gray-800">
                <tr>
                  <TableRowNumberHeader className="!normal-case" />
                  <th className="px-4 py-2 text-left">Title</th>
                  <th className="px-4 py-2 text-left">Standard</th>
                  <th className="px-4 py-2 text-left">Status</th>
                  <th className="px-4 py-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {rows.map((d, index) => (
                  <tr key={d.id}>
                    <TableRowNumberCell number={getDisplayRowNumber(index)} />
                    <td className="px-4 py-2 font-medium">{d.defect_title}</td>
                    <td className="px-4 py-2 text-gray-500 dark:text-gray-400">{d.affected_standard || '—'}</td>
                    <td className="px-4 py-2">
                      <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium capitalize ${STATUS_COLORS[d.status] || STATUS_COLORS.open}`}>
                        {(d.status || 'open').replace('-', ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-2">
                      <div className="flex items-center justify-end gap-2">
                        <RowActionButton variant="edit" label={`Edit ${d.defect_title}`} onClick={() => openEdit(d)} />
                        <RowActionButton variant="delete" label={`Delete ${d.defect_title}`} onClick={() => handleDelete(d)} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
