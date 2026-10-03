/**
 * OKR Objective — create/edit form (GAP-03, v963 Phase 8). Simulator mirror of
 * apps/platform/src/pages/okr/OkrObjectiveForm.jsx. Routed page per rule 65.
 */
import { useEffect, useMemo, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { useSuccessModal } from '@nidus/shared/hooks/useSuccessModal'
import { useUnsavedChangesGuard } from '@nidus/shared/context/UnsavedChangesContext'
import { getCurrentUserAccountId } from '@nidus/shared/utils/accountResolution'
import { listCycles, getObjective, createObjective, updateObjective } from '../../services/okrService'

const inputClass = 'w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm'
const BASE = '/simulator/pm/okr/objectives'

export default function OkrObjectiveForm() {
  const { objectiveId } = useParams()
  const navigate = useNavigate()
  const { showSuccess, modal } = useSuccessModal()
  const isEdit = !!objectiveId

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [cycles, setCycles] = useState([])
  const [cycleId, setCycleId] = useState('')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [scopeLevel, setScopeLevel] = useState('organisation')
  const [healthStatus, setHealthStatus] = useState('on_track')
  const [progressPct, setProgressPct] = useState(0)
  const [initialSnapshot, setInitialSnapshot] = useState(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      const cycleList = await listCycles()
      if (cancelled) return
      setCycles(cycleList)

      if (!isEdit) {
        const defaultCycle = cycleList[0]?.id || ''
        setCycleId(defaultCycle)
        setInitialSnapshot(JSON.stringify({ cycleId: defaultCycle, title: '', description: '', scopeLevel: 'organisation', healthStatus: 'on_track', progressPct: 0 }))
        setLoading(false)
        return
      }

      const record = await getObjective(objectiveId)
      if (cancelled || !record) return
      setCycleId(record.cycle_id || '')
      setTitle(record.objective_title || '')
      setDescription(record.objective_description || '')
      setScopeLevel(record.scope_level || 'organisation')
      setHealthStatus(record.health_status || 'on_track')
      setProgressPct(record.progress_pct ?? 0)
      setInitialSnapshot(JSON.stringify({
        cycleId: record.cycle_id || '', title: record.objective_title || '', description: record.objective_description || '',
        scopeLevel: record.scope_level || 'organisation', healthStatus: record.health_status || 'on_track', progressPct: record.progress_pct ?? 0,
      }))
      setLoading(false)
    })()
    return () => { cancelled = true }
  }, [objectiveId, isEdit])

  const isDirty = useMemo(() => {
    if (initialSnapshot === null) return false
    return JSON.stringify({ cycleId, title, description, scopeLevel, healthStatus, progressPct }) !== initialSnapshot
  }, [cycleId, title, description, scopeLevel, healthStatus, progressPct, initialSnapshot])

  const { requestNavigation, confirmDiscard } = useUnsavedChangesGuard(isDirty, 'You have unsaved changes to this objective.')

  const handleSave = async () => {
    if (!title.trim() || !cycleId) return
    setSaving(true)
    setError(null)
    const payload = {
      cycle_id: cycleId,
      objective_title: title.trim(),
      objective_description: description.trim() || null,
      scope_level: scopeLevel,
      health_status: healthStatus,
      progress_pct: Number(progressPct) || 0,
    }
    try {
      if (!isEdit) {
        payload.account_id = await getCurrentUserAccountId()
      }
      const result = isEdit ? await updateObjective(objectiveId, payload) : await createObjective(payload)
      showSuccess({
        recordId: result?.objective_title || title,
        operation: isEdit ? 'updated' : 'created',
        onOk: () => navigate(isEdit ? `${BASE}/${objectiveId}` : BASE, { replace: true }),
      })
    } catch (e) {
      setError(e?.message || 'Failed to save objective.')
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    const target = isEdit ? `${BASE}/${objectiveId}` : BASE
    if (isDirty) confirmDiscard(() => navigate(target))
    else requestNavigation(target)
  }

  if (loading) {
    return <div className="p-8 text-gray-500 dark:text-gray-400">Loading…</div>
  }

  return (
    <div className="p-4 sm:p-6 max-w-2xl mx-auto space-y-6">
      <button type="button" onClick={handleCancel} className="inline-flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200">
        <ArrowLeft className="h-4 w-4" />
        Back
      </button>

      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{isEdit ? 'Edit Objective' : 'New Objective'}</h1>

      {error && <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 text-sm">{error}</div>}

      <div className="space-y-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Cycle *</label>
          <select value={cycleId} onChange={(e) => setCycleId(e.target.value)} className={inputClass}>
            <option value="">Select a cycle…</option>
            {cycles.map((c) => (
              <option key={c.id} value={c.id}>{c.cycle_name}</option>
            ))}
          </select>
          {cycles.length === 0 && (
            <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">No cycles exist yet — create one first from OKR Cycles.</p>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Objective title *</label>
          <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} className={inputClass} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className={inputClass} />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Scope</label>
            <select value={scopeLevel} onChange={(e) => setScopeLevel(e.target.value)} className={inputClass}>
              <option value="organisation">Organisation</option>
              <option value="department">Department</option>
              <option value="team">Team</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Health</label>
            <select value={healthStatus} onChange={(e) => setHealthStatus(e.target.value)} className={inputClass}>
              <option value="on_track">On track</option>
              <option value="at_risk">At risk</option>
              <option value="behind">Behind</option>
              <option value="completed">Completed</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Progress %</label>
            <input type="number" min="0" max="100" value={progressPct} onChange={(e) => setProgressPct(e.target.value)} className={inputClass} />
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving || !title.trim() || !cycleId}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium"
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
        <button type="button" onClick={handleCancel} className="px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-900 dark:text-gray-100 rounded-lg text-sm font-medium">
          Cancel
        </button>
      </div>
      {modal}
    </div>
  )
}
