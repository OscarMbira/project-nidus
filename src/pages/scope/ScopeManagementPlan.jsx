import { useState, useEffect, useCallback } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useProjectRole } from '../../hooks/useProjectRole'
import { getScopeManagementPlanByProject, saveScopeManagementPlan } from '../../services/scopeManagementPlanService'
import { platformDb } from '../../services/supabase/supabaseClient'
import ExportRecordButtons from '../../components/ui/ExportRecordButtons'
import {
  exportRecordToExcel,
  exportRecordToWord,
  exportRecordToPPT,
  exportRecordToCSV,
  exportRecordToXML,
  exportRecordToJSON,
  exportRecordToPrint,
} from '../../utils/exportUtils'

const SECTIONS = [
  {
    title: 'Scope management plan',
    fields: [
      { key: 'scope_definition_approach', label: 'Scope definition approach' },
      { key: 'change_control_process', label: 'Change control process' },
      { key: 'scope_validation_method', label: 'Scope validation method' },
      { key: 'deliverable_acceptance_process', label: 'Deliverable acceptance' },
      { key: 'roles_responsibilities', label: 'Roles & responsibilities' },
      { key: 'wbs_maintenance_process', label: 'WBS maintenance' },
      { key: 'scope_baseline_info', label: 'Scope baseline' },
      { key: 'status', label: 'Status' },
      { key: 'version', label: 'Version' },
    ],
  },
]

export default function ScopeManagementPlan() {
  const { projectId } = useParams()
  const { canEdit } = useProjectRole(projectId)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [record, setRecord] = useState(null)
  const [success, setSuccess] = useState(null)
  const [form, setForm] = useState({
    scope_definition_approach: '',
    change_control_process: '',
    scope_validation_method: '',
    deliverable_acceptance_process: '',
    roles_responsibilities: '',
    wbs_maintenance_process: '',
    scope_baseline_info: '',
    status: 'draft',
    version: '1.0',
  })

  const load = useCallback(async () => {
    if (!projectId) return
    setLoading(true)
    const res = await getScopeManagementPlanByProject(projectId)
    if (res.success && res.data) {
      setRecord(res.data)
      setForm({
        scope_definition_approach: res.data.scope_definition_approach || '',
        change_control_process: res.data.change_control_process || '',
        scope_validation_method: res.data.scope_validation_method || '',
        deliverable_acceptance_process: res.data.deliverable_acceptance_process || '',
        roles_responsibilities: res.data.roles_responsibilities || '',
        wbs_maintenance_process: res.data.wbs_maintenance_process || '',
        scope_baseline_info: res.data.scope_baseline_info || '',
        status: res.data.status || 'draft',
        version: res.data.version || '1.0',
      })
    } else {
      setRecord(null)
    }
    setLoading(false)
  }, [projectId])

  useEffect(() => {
    load()
  }, [load])

  const save = async (asDraft) => {
    if (!projectId || !canEdit) return
    setSaving(true)
    setSuccess(null)
    try {
      const { data: { user } } = await platformDb.auth.getUser()
      if (!user) throw new Error('Not signed in')
      const res = await saveScopeManagementPlan(
        projectId,
        { ...form, status: asDraft ? 'draft' : form.status },
        user.id
      )
      if (!res.success) throw new Error(res.error)
      setRecord(res.data)
      setSuccess({
        op: res.operation || 'saved',
        id: res.data?.id,
        message: `Scope management plan ${res.operation === 'created' ? 'created' : 'updated'} successfully.`,
      })
    } catch (e) {
      setSuccess({ error: e.message })
    } finally {
      setSaving(false)
    }
  }

  if (!projectId) {
    return <p className="p-6 text-gray-600 dark:text-gray-400">Missing project.</p>
  }

  if (loading) {
    return <div className="flex min-h-[40vh] items-center justify-center text-gray-500">Loading…</div>
  }

  const exportPayload = { ...form, id: record?.id }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 dark:bg-gray-950">
      <nav className="mb-4 text-sm text-gray-500 dark:text-gray-400">
        <Link to={`/platform/projects/${projectId}`} className="hover:underline">
          Project
        </Link>
        <span className="mx-2">/</span>
        <span>Scope management plan</span>
      </nav>

      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Scope management plan</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Plan scope management (PMBOK 5.2).</p>
        </div>
        <ExportRecordButtons
          onExportPPT={() => exportRecordToPPT(SECTIONS, exportPayload, `ScopeMgmtPlan_${projectId}`)}
          onExportWord={() => exportRecordToWord(SECTIONS, exportPayload, `ScopeMgmtPlan_${projectId}`)}
          onExportExcel={() => exportRecordToExcel(SECTIONS, exportPayload, `ScopeMgmtPlan_${projectId}`)}
          onExportCSV={() => exportRecordToCSV(SECTIONS, exportPayload, `ScopeMgmtPlan_${projectId}`)}
          onExportXML={() => exportRecordToXML(SECTIONS, exportPayload, `ScopeMgmtPlan_${projectId}`)}
          onExportJSON={() => exportRecordToJSON(SECTIONS, exportPayload, `ScopeMgmtPlan_${projectId}`)}
          onExportPrint={() => exportRecordToPrint(SECTIONS, exportPayload, `ScopeMgmtPlan_${projectId}`)}
        />
      </div>

      {success?.message && (
        <div
          className="mb-4 rounded-lg border border-emerald-600/40 bg-emerald-950/30 px-4 py-3 text-sm text-emerald-200"
          role="status"
        >
          {success.message} Record ID: {success.id}
        </div>
      )}
      {success?.error && (
        <div className="mb-4 rounded-lg border border-red-600/40 bg-red-950/30 px-4 py-3 text-sm text-red-200">{success.error}</div>
      )}

      <div className="space-y-4 rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-900">
        {[
          ['scope_definition_approach', 'Scope definition approach'],
          ['change_control_process', 'Change control process'],
          ['scope_validation_method', 'Scope validation method'],
          ['deliverable_acceptance_process', 'Deliverable acceptance process'],
          ['roles_responsibilities', 'Roles & responsibilities'],
          ['wbs_maintenance_process', 'WBS maintenance process'],
          ['scope_baseline_info', 'Scope baseline information'],
        ].map(([key, label]) => (
          <div key={key}>
            <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">{label}</label>
            <textarea
              value={form[key]}
              onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
              disabled={!canEdit}
              rows={3}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 disabled:opacity-60 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
            />
          </div>
        ))}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-xs text-gray-600 dark:text-gray-400">Status</label>
            <select
              value={form.status}
              onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
              disabled={!canEdit}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
            >
              <option value="draft">draft</option>
              <option value="approved">approved</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs text-gray-600 dark:text-gray-400">Version</label>
            <input
              value={form.version}
              onChange={(e) => setForm((f) => ({ ...f, version: e.target.value }))}
              disabled={!canEdit}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
            />
          </div>
        </div>
        {canEdit && (
          <div className="flex flex-wrap gap-2 pt-2">
            <button
              type="button"
              disabled={saving}
              onClick={() => save(true)}
              className="rounded-lg border border-gray-400 px-4 py-2 text-sm text-gray-800 hover:bg-gray-100 dark:border-gray-500 dark:text-gray-200 dark:hover:bg-gray-800"
            >
              Save as draft
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={() => save(false)}
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
