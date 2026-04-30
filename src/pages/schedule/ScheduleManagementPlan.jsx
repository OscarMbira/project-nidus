import { useState, useEffect, useCallback } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useProjectRole } from '../../hooks/useProjectRole'
import { getScheduleManagementPlanByProject, saveScheduleManagementPlan } from '../../services/scheduleManagementPlanService'
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
    title: 'Schedule management plan',
    fields: [
      { key: 'scheduling_methodology', label: 'Methodology' },
      { key: 'scheduling_tool', label: 'Tool' },
      { key: 'level_of_accuracy', label: 'Accuracy' },
      { key: 'units_of_measure', label: 'Units' },
      { key: 'reporting_formats', label: 'Reporting' },
      { key: 'schedule_model_maintenance', label: 'Model maintenance' },
      { key: 'status', label: 'Status' },
      { key: 'version', label: 'Version' },
    ],
  },
]

export default function ScheduleManagementPlan() {
  const { projectId } = useParams()
  const { canEdit } = useProjectRole(projectId)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(null)
  const [form, setForm] = useState({
    scheduling_methodology: '',
    scheduling_tool: '',
    level_of_accuracy: '',
    units_of_measure: '',
    reporting_formats: '',
    schedule_model_maintenance: '',
    control_thresholds_json: '{}',
    variance_thresholds_json: '{}',
    status: 'draft',
    version: '1.0',
  })

  const load = useCallback(async () => {
    if (!projectId) return
    setLoading(true)
    const res = await getScheduleManagementPlanByProject(projectId)
    if (res.success && res.data) {
      const d = res.data
      setForm({
        scheduling_methodology: d.scheduling_methodology || '',
        scheduling_tool: d.scheduling_tool || '',
        level_of_accuracy: d.level_of_accuracy || '',
        units_of_measure: d.units_of_measure || '',
        reporting_formats: d.reporting_formats || '',
        schedule_model_maintenance: d.schedule_model_maintenance || '',
        control_thresholds_json: JSON.stringify(d.control_thresholds || {}, null, 2),
        variance_thresholds_json: JSON.stringify(d.variance_thresholds || {}, null, 2),
        status: d.status || 'draft',
        version: d.version || '1.0',
      })
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
      let control_thresholds = {}
      let variance_thresholds = {}
      try {
        control_thresholds = JSON.parse(form.control_thresholds_json || '{}')
      } catch {
        throw new Error('Control thresholds must be valid JSON')
      }
      try {
        variance_thresholds = JSON.parse(form.variance_thresholds_json || '{}')
      } catch {
        throw new Error('Variance thresholds must be valid JSON')
      }
      const res = await saveScheduleManagementPlan(
        projectId,
        {
          scheduling_methodology: form.scheduling_methodology,
          scheduling_tool: form.scheduling_tool,
          level_of_accuracy: form.level_of_accuracy,
          units_of_measure: form.units_of_measure,
          reporting_formats: form.reporting_formats,
          schedule_model_maintenance: form.schedule_model_maintenance,
          control_thresholds,
          variance_thresholds,
          status: asDraft ? 'draft' : form.status,
          version: form.version,
        },
        user.id
      )
      if (!res.success) throw new Error(res.error)
      setSuccess({
        message: `Schedule management plan ${res.operation === 'created' ? 'created' : 'updated'} successfully.`,
        id: res.data?.id,
      })
    } catch (e) {
      setSuccess({ error: e.message })
    } finally {
      setSaving(false)
    }
  }

  if (!projectId) return <p className="p-6 text-gray-500">Missing project.</p>
  if (loading) return <div className="flex min-h-[40vh] items-center justify-center">Loading…</div>

  const exportPayload = { ...form }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 dark:bg-gray-950">
      <nav className="mb-4 text-sm text-gray-500 dark:text-gray-400">
        <Link to={`/platform/projects/${projectId}`} className="hover:underline">
          Project
        </Link>
        <span className="mx-2">/</span>
        <span>Schedule management plan</span>
      </nav>
      <div className="mb-6 flex flex-wrap justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Schedule management plan</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Plan schedule management (Process Guide 5.6).</p>
        </div>
        <ExportRecordButtons
          onExportPPT={() => exportRecordToPPT(SECTIONS, exportPayload, `ScheduleMgmtPlan_${projectId}`)}
          onExportWord={() => exportRecordToWord(SECTIONS, exportPayload, `ScheduleMgmtPlan_${projectId}`)}
          onExportExcel={() => exportRecordToExcel(SECTIONS, exportPayload, `ScheduleMgmtPlan_${projectId}`)}
          onExportCSV={() => exportRecordToCSV(SECTIONS, exportPayload, `ScheduleMgmtPlan_${projectId}`)}
          onExportXML={() => exportRecordToXML(SECTIONS, exportPayload, `ScheduleMgmtPlan_${projectId}`)}
          onExportJSON={() => exportRecordToJSON(SECTIONS, exportPayload, `ScheduleMgmtPlan_${projectId}`)}
          onExportPrint={() => exportRecordToPrint(SECTIONS, exportPayload, `ScheduleMgmtPlan_${projectId}`)}
        />
      </div>
      {success?.message && (
        <div className="mb-4 rounded-lg border border-emerald-600/40 bg-emerald-950/30 px-4 py-3 text-sm text-emerald-200" role="status">
          {success.message} Record ID: {success.id}
        </div>
      )}
      {success?.error && <div className="mb-4 rounded-lg border border-red-800 bg-red-950/40 px-4 py-3 text-sm text-red-200">{success.error}</div>}

      <div className="space-y-4 rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-900">
        {[
          ['scheduling_methodology', 'Scheduling methodology'],
          ['scheduling_tool', 'Scheduling tool'],
          ['level_of_accuracy', 'Level of accuracy'],
          ['units_of_measure', 'Units of measure'],
          ['reporting_formats', 'Reporting formats'],
          ['schedule_model_maintenance', 'Schedule model maintenance'],
        ].map(([k, lab]) => (
          <div key={k}>
            <label className="mb-1 block text-xs text-gray-600 dark:text-gray-400">{lab}</label>
            <textarea
              value={form[k]}
              onChange={(e) => setForm((f) => ({ ...f, [k]: e.target.value }))}
              disabled={!canEdit}
              rows={k === 'scheduling_methodology' ? 4 : 2}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-800 dark:text-white disabled:opacity-60"
            />
          </div>
        ))}
        <div>
          <label className="mb-1 block text-xs text-gray-600 dark:text-gray-400">Control thresholds (JSON)</label>
          <textarea
            value={form.control_thresholds_json}
            onChange={(e) => setForm((f) => ({ ...f, control_thresholds_json: e.target.value }))}
            disabled={!canEdit}
            rows={4}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 font-mono text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white disabled:opacity-60"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-gray-600 dark:text-gray-400">Variance thresholds (JSON)</label>
          <textarea
            value={form.variance_thresholds_json}
            onChange={(e) => setForm((f) => ({ ...f, variance_thresholds_json: e.target.value }))}
            disabled={!canEdit}
            rows={4}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 font-mono text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white disabled:opacity-60"
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-xs text-gray-600 dark:text-gray-400">Status</label>
            <select
              value={form.status}
              onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
              disabled={!canEdit}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
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
              className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
            />
          </div>
        </div>
        {canEdit && (
          <div className="flex gap-2 pt-2">
            <button type="button" disabled={saving} onClick={() => save(true)} className="rounded-lg border border-gray-400 px-4 py-2 text-sm dark:border-gray-500">
              Save as draft
            </button>
            <button type="button" disabled={saving} onClick={() => save(false)} className="rounded-lg bg-emerald-600 px-4 py-2 text-sm text-white disabled:opacity-50">
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
