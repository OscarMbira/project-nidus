import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams, useLocation } from 'react-router-dom'
import toast from 'react-hot-toast'
import * as platformSvc from '../../services/workAuthorisationService'
import * as simSvc from '../../services/simWorkAuthorisationService'

import { getDisplayRowNumber } from '../../utils/tableRowNumberUtils'
const ACTION_TYPES = [
  { value: 'stage_gate', label: 'Stage gate' },
  { value: 'closure', label: 'Closure' },
  { value: 'intake', label: 'Project intake / readiness' },
  { value: 'change', label: 'Change / high-impact decision' },
  { value: 'issue', label: 'Issue / exception' },
  { value: 'other', label: 'Other' },
]

export default function WorkAuthorisationCreatePage() {
  const location = useLocation()
  const mode = useMemo(() => (location.pathname.includes('/simulator/') ? 'sim' : 'platform'), [location.pathname])
  const { id } = useParams()
  const navigate = useNavigate()
  const svc = mode === 'sim' ? simSvc : platformSvc
  const basePath = mode === 'sim'
    ? '/simulator/pm/controls/work-authorisations'
    : '/platform/work-authorisations'

  const [projects, setProjects] = useState([])
  const [projectId, setProjectId] = useState('')
  const [title, setTitle] = useState('')
  const [actionType, setActionType] = useState('stage_gate')
  const [rationale, setRationale] = useState('')
  const [risk, setRisk] = useState('')
  const [start, setStart] = useState('')
  const [end, setEnd] = useState('')
  const [loading, setLoading] = useState(!!id)

  useEffect(() => {
    async function loadProjects() {
      const list = mode === 'sim'
        ? await simSvc.fetchPracticeProjectsForUser()
        : await platformSvc.fetchProjectsForUser()
      setProjects(list)
    }
    loadProjects()
  }, [mode])

  useEffect(() => {
    if (!id) return
    async function load() {
      const res = await svc.getWorkAuthorisation(id)
      if (res.success && res.data) {
        const r = res.data
        if (mode === 'platform') setProjectId(r.project_id || '')
        else setProjectId(r.practice_project_id || '')
        setTitle(r.title || '')
        setActionType(r.action_type || 'stage_gate')
        setRationale(r.rationale || '')
        setRisk(r.risk_impact_summary || '')
        setStart(r.planned_start_date || '')
        setEnd(r.planned_end_date || '')
      }
      setLoading(false)
    }
    load()
  }, [id, mode, svc])

  async function saveDraft() {
    const payload = mode === 'platform'
      ? {
          project_id: projectId,
          action_type: actionType,
          title: title.trim(),
          rationale: rationale.trim() || null,
          risk_impact_summary: risk.trim() || null,
          planned_start_date: start || null,
          planned_end_date: end || null,
        }
      : {
          practice_project_id: projectId,
          action_type: actionType,
          title: title.trim(),
          rationale: rationale.trim() || null,
          risk_impact_summary: risk.trim() || null,
          planned_start_date: start || null,
          planned_end_date: end || null,
        }

    if (!projectId || !title.trim()) {
      toast.error('Project and title are required.')
      return
    }

    const res = id
      ? await svc.updateDraft(id, payload)
      : await svc.createDraft(payload)

    if (res.success) {
      const rec = res.data
      toast.success(
        `Saved successfully. Reference ${rec.reference_code || rec.id}. Operation: ${id ? 'update' : 'create'}.`
      )
      navigate(`${basePath}/${rec.id}`)
    } else {
      toast.error(res.message || 'Save failed')
    }
  }

  async function saveAndSubmit() {
    const payload = mode === 'platform'
      ? {
          project_id: projectId,
          action_type: actionType,
          title: title.trim(),
          rationale: rationale.trim() || null,
          risk_impact_summary: risk.trim() || null,
          planned_start_date: start || null,
          planned_end_date: end || null,
        }
      : {
          practice_project_id: projectId,
          action_type: actionType,
          title: title.trim(),
          rationale: rationale.trim() || null,
          risk_impact_summary: risk.trim() || null,
          planned_start_date: start || null,
          planned_end_date: end || null,
        }

    if (!projectId || !title.trim()) {
      toast.error('Project and title are required.')
      return
    }

    const res = id
      ? await svc.updateDraft(id, payload)
      : await svc.createDraft(payload)

    if (!res.success) {
      toast.error(res.message || 'Save failed')
      return
    }
    const rec = res.data
    const tr = await svc.transition(rec.id, 'submit', null)
    if (tr.success) {
      toast.success(
        `Submitted ${rec.reference_code || rec.id}. Status: in review. Operation: submit.`
      )
      navigate(`${basePath}/${rec.id}`)
    } else {
      toast.error(tr.message || 'Submit failed')
    }
  }

  if (loading) {
    return <div className="p-8 text-gray-600 dark:text-gray-400">Loading…</div>
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 text-gray-900 dark:text-gray-100">
      <div className="mb-6">
        <Link to={basePath} className="text-sm text-blue-600 dark:text-blue-400 hover:underline">
          ← Back to list
        </Link>
        <h1 className="text-2xl font-bold mt-2">{id ? 'Edit draft' : 'New work authorisation'}</h1>
      </div>

      <div className="space-y-4 rounded-xl border border-gray-200 dark:border-gray-700 p-6 bg-white dark:bg-gray-800/40">
        <div>
          <label className="block text-sm font-medium mb-1">{mode === 'sim' ? 'Practice project' : 'Project'} *</label>
          <select
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
            className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 p-2 text-sm"
            disabled={!!id}
          >
            <option value="">Select…</option>
            {projects.map((p, index) => (
              <option key={p.id} value={p.id}>
                {p.project_name}{p.project_code ? ` (${p.project_code})` : ''}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Title *</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 p-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Action type</label>
          <select
            value={actionType}
            onChange={(e) => setActionType(e.target.value)}
            className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 p-2 text-sm"
          >
            {ACTION_TYPES.map((a, index) => (
              <option key={a.value} value={a.value}>{a.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Rationale</label>
          <textarea
            value={rationale}
            onChange={(e) => setRationale(e.target.value)}
            rows={4}
            className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 p-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Risk / impact summary</label>
          <textarea
            value={risk}
            onChange={(e) => setRisk(e.target.value)}
            rows={3}
            className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 p-2 text-sm"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium mb-1">Planned start</label>
            <input
              type="date"
              value={start}
              onChange={(e) => setStart(e.target.value)}
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 p-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Planned end</label>
            <input
              type="date"
              value={end}
              onChange={(e) => setEnd(e.target.value)}
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 p-2 text-sm"
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-2 pt-4">
          <button
            type="button"
            onClick={saveDraft}
            className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-sm"
          >
            Save draft
          </button>
          <button
            type="button"
            onClick={saveAndSubmit}
            className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm"
          >
            Save & submit for review
          </button>
        </div>
      </div>
    </div>
  )
}
