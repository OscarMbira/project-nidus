import { useState, useEffect, useCallback } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { useSimPracticeOwner } from '../../../hooks/useSimPracticeOwner'
import { simGetRequirement, simSaveRequirement, simSoftDeleteRequirement } from '../../../services/sim/simPlanningService'
import { getPracticeStakeholders } from '../../../services/sim/practiceStakeholderService'
import { simDb } from '../../../services/supabase/supabaseClient'
import ExportRecordButtons from '../../../components/ui/ExportRecordButtons'
import {
  exportRecordToExcel,
  exportRecordToWord,
  exportRecordToPPT,
  exportRecordToCSV,
  exportRecordToXML,
  exportRecordToJSON,
  exportRecordToPrint,
} from '../../../utils/exportUtils'

const SECTIONS = [
  {
    title: 'Requirement',
    fields: [
      { key: 'requirement_code', label: 'Code' },
      { key: 'name', label: 'Name' },
      { key: 'description', label: 'Description' },
      { key: 'category', label: 'Category' },
      { key: 'priority', label: 'Priority' },
      { key: 'status', label: 'Status' },
    ],
  },
]

export default function RequirementDetail() {
  const { projectId, reqId } = useParams()
  const navigate = useNavigate()
  const isNew = reqId === 'new'
  const { canEdit } = useSimPracticeOwner(projectId)
  const [loading, setLoading] = useState(!isNew)
  const [saving, setSaving] = useState(false)
  const [stakeholders, setStakeholders] = useState([])
  const [success, setSuccess] = useState(null)
  const [form, setForm] = useState({
    requirement_code: '',
    name: '',
    description: '',
    category: '',
    source_stakeholder_id: '',
    priority: '',
    status: 'draft',
    acceptance_criteria: '',
    traceability_tag: '',
    version: '1.0',
  })

  const loadStakeholders = useCallback(async () => {
    if (!projectId) return
    try {
      const res = await getPracticeStakeholders(projectId)
      const data = res?.success ? res.data || [] : []
      setStakeholders(Array.isArray(data) ? data : [])
    } catch {
      setStakeholders([])
    }
  }, [projectId])

  const load = useCallback(async () => {
    if (!projectId || isNew) {
      setLoading(false)
      return
    }
    setLoading(true)
    const res = await simGetRequirement(projectId, reqId)
    if (res.success && res.data) {
      const d = res.data
      setForm({
        requirement_code: d.requirement_code || '',
        name: d.name || '',
        description: d.description || '',
        category: d.category || '',
        source_stakeholder_id: d.source_stakeholder_id || '',
        priority: d.priority || '',
        status: d.status || 'draft',
        acceptance_criteria: d.acceptance_criteria || '',
        traceability_tag: d.traceability_tag || '',
        version: d.version || '1.0',
      })
    }
    setLoading(false)
  }, [projectId, reqId, isNew])

  useEffect(() => {
    loadStakeholders()
  }, [loadStakeholders])

  useEffect(() => {
    load()
  }, [load])

  const save = async (asDraft) => {
    if (!projectId || !canEdit) return
    setSaving(true)
    setSuccess(null)
    try {
      const { data: { user } } = await simDb.auth.getUser()
      if (!user) throw new Error('Not signed in')
      const res = await simSaveRequirement(
        projectId,
        {
          id: isNew ? undefined : reqId,
          ...form,
          source_stakeholder_id: form.source_stakeholder_id || null,
          status: asDraft ? 'draft' : form.status,
        },
        user.id
      )
      if (!res.success) throw new Error(res.error)
      setSuccess({
        message: `Requirement ${res.operation === 'created' ? 'created' : 'updated'} successfully.`,
        id: res.data?.id,
        op: res.operation,
      })
      if (isNew && res.data?.id) {
        navigate(`/simulator/practice-projects/${projectId}/scope/requirements/${res.data.id}`, { replace: true })
      }
    } catch (e) {
      setSuccess({ error: e.message })
    } finally {
      setSaving(false)
    }
  }

  const del = async () => {
    if (!projectId || isNew || !canEdit) return
    if (!window.confirm('Delete this requirement?')) return
    const { data: { user } } = await simDb.auth.getUser()
    if (!user) return
    const res = await simSoftDeleteRequirement(reqId, projectId)
    if (res.success) navigate(`/simulator/practice-projects/${projectId}/scope/requirements`)
    else setSuccess({ error: res.error })
  }

  if (!projectId) return <p className="p-6 text-gray-500">Missing project.</p>
  if (loading) return <div className="flex min-h-[40vh] items-center justify-center">Loading…</div>

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 dark:bg-gray-950">
      <nav className="mb-4 text-sm text-gray-500 dark:text-gray-400">
        <Link to={`/simulator/practice-projects/${projectId}`} className="hover:underline">
          Project
        </Link>
        <span className="mx-2">/</span>
        <Link to={`/simulator/practice-projects/${projectId}/scope/requirements`} className="hover:underline">
          Requirements
        </Link>
        <span className="mx-2">/</span>
        <span>{isNew ? 'New' : 'Detail'}</span>
      </nav>

      <div className="mb-6 flex flex-wrap justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{isNew ? 'New requirement' : 'Requirement'}</h1>
        <ExportRecordButtons
          onExportPPT={() => exportRecordToPPT(SECTIONS, form, `Requirement_${reqId}`)}
          onExportWord={() => exportRecordToWord(SECTIONS, form, `Requirement_${reqId}`)}
          onExportExcel={() => exportRecordToExcel(SECTIONS, form, `Requirement_${reqId}`)}
          onExportCSV={() => exportRecordToCSV(SECTIONS, form, `Requirement_${reqId}`)}
          onExportXML={() => exportRecordToXML(SECTIONS, form, `Requirement_${reqId}`)}
          onExportJSON={() => exportRecordToJSON(SECTIONS, form, `Requirement_${reqId}`)}
          onExportPrint={() => exportRecordToPrint(SECTIONS, form, `Requirement_${reqId}`)}
        />
      </div>

      {success?.message && (
        <div className="mb-4 rounded-lg border border-emerald-600/40 bg-emerald-950/30 px-4 py-3 text-sm text-emerald-200" role="status">
          {success.message} Record ID: {success.id}
        </div>
      )}
      {success?.error && <div className="mb-4 rounded-lg border border-red-800 bg-red-950/40 px-4 py-3 text-sm text-red-200">{success.error}</div>}

      <div className="space-y-4 rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-900">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-xs text-gray-600 dark:text-gray-400">Code</label>
            <input
              value={form.requirement_code}
              onChange={(e) => setForm((f) => ({ ...f, requirement_code: e.target.value }))}
              disabled={!canEdit}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-800 dark:text-white disabled:opacity-60"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-gray-600 dark:text-gray-400">Version</label>
            <input
              value={form.version}
              onChange={(e) => setForm((f) => ({ ...f, version: e.target.value }))}
              disabled={!canEdit}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-800 dark:text-white disabled:opacity-60"
            />
          </div>
        </div>
        <div>
          <label className="mb-1 block text-xs text-gray-600 dark:text-gray-400">Name *</label>
          <input
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            disabled={!canEdit}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-800 dark:text-white disabled:opacity-60"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-gray-600 dark:text-gray-400">Description</label>
          <textarea
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            disabled={!canEdit}
            rows={3}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-800 dark:text-white disabled:opacity-60"
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-xs text-gray-600 dark:text-gray-400">Category</label>
            <select
              value={form.category}
              onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
              disabled={!canEdit}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
            >
              <option value="">—</option>
              <option value="business">business</option>
              <option value="functional">functional</option>
              <option value="non_functional">non_functional</option>
              <option value="technical">technical</option>
              <option value="regulatory">regulatory</option>
              <option value="other">other</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs text-gray-600 dark:text-gray-400">Priority (MoSCoW)</label>
            <select
              value={form.priority}
              onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value }))}
              disabled={!canEdit}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
            >
              <option value="">—</option>
              <option value="must">must</option>
              <option value="should">should</option>
              <option value="could">could</option>
              <option value="wont">wont</option>
            </select>
          </div>
        </div>
        <div>
          <label className="mb-1 block text-xs text-gray-600 dark:text-gray-400">Source stakeholder</label>
          <select
            value={form.source_stakeholder_id}
            onChange={(e) => setForm((f) => ({ ...f, source_stakeholder_id: e.target.value }))}
            disabled={!canEdit}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
          >
            <option value="">—</option>
            {stakeholders.map((s) => (
              <option key={s.id} value={s.id}>
                {s.stakeholder_name || s.stakeholder_reference || s.id}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs text-gray-600 dark:text-gray-400">Acceptance criteria</label>
          <textarea
            value={form.acceptance_criteria}
            onChange={(e) => setForm((f) => ({ ...f, acceptance_criteria: e.target.value }))}
            disabled={!canEdit}
            rows={3}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-800 dark:text-white disabled:opacity-60"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-gray-600 dark:text-gray-400">Traceability tag</label>
          <input
            value={form.traceability_tag}
            onChange={(e) => setForm((f) => ({ ...f, traceability_tag: e.target.value }))}
            disabled={!canEdit}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-800 dark:text-white disabled:opacity-60"
          />
        </div>
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
            <option value="deferred">deferred</option>
            <option value="rejected">rejected</option>
            <option value="implemented">implemented</option>
          </select>
        </div>
        {canEdit && (
          <div className="flex flex-wrap gap-2 pt-2">
            <button type="button" disabled={saving} onClick={() => save(true)} className="rounded-lg border border-gray-400 px-4 py-2 text-sm dark:border-gray-500">
              Save as draft
            </button>
            <button type="button" disabled={saving || !form.name.trim()} onClick={() => save(false)} className="rounded-lg bg-emerald-600 px-4 py-2 text-sm text-white disabled:opacity-50">
              {saving ? 'Saving…' : 'Save'}
            </button>
            {!isNew && (
              <button type="button" onClick={del} className="rounded-lg border border-red-600 px-4 py-2 text-sm text-red-600 dark:text-red-400">
                Delete
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
