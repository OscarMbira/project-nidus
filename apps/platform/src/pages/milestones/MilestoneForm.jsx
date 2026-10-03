/**
 * Milestone Register — create/edit form (v966 Phase 11). Routed page per rule 65 (no modal).
 * Success modal (rule 16) and unsaved-changes guard (rule 52).
 */
import { useState, useEffect, useMemo } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { useSuccessModal } from '@nidus/shared/hooks/useSuccessModal'
import { useUnsavedChangesGuard } from '@nidus/shared/context/UnsavedChangesContext'
import { usePlatformProjectId } from '@nidus/shared/hooks/usePlatformProjectId.js'
import { getMilestone, createMilestone, updateMilestone, MILESTONE_STATUSES } from '../../services/milestoneService'

const inputClass =
  'w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm'

const STATUS_LABELS = {
  planned: 'Planned',
  at_risk: 'At Risk',
  achieved: 'Achieved',
  missed: 'Missed',
  slipped: 'Slipped',
}

export default function MilestoneForm() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { projectId, routeKey } = usePlatformProjectId()
  const { showSuccess, modal } = useSuccessModal()
  const isEdit = !!id

  const [loading, setLoading] = useState(isEdit)
  const [saving, setSaving] = useState(false)
  const [milestoneName, setMilestoneName] = useState('')
  const [description, setDescription] = useState('')
  const [targetDate, setTargetDate] = useState('')
  const [forecastDate, setForecastDate] = useState('')
  const [actualDate, setActualDate] = useState('')
  const [status, setStatus] = useState('planned')
  const [notes, setNotes] = useState('')
  const [initialSnapshot, setInitialSnapshot] = useState(null)

  const snapshotOf = (v) => JSON.stringify(v)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      if (isEdit) {
        setLoading(true)
        const result = await getMilestone(id)
        if (cancelled) return
        const m = result.data
        setMilestoneName(m?.milestone_name || '')
        setDescription(m?.description || '')
        setTargetDate(m?.target_date || '')
        setForecastDate(m?.forecast_date || '')
        setActualDate(m?.actual_date || '')
        setStatus(m?.status || 'planned')
        setNotes(m?.notes || '')
        setInitialSnapshot(snapshotOf({
          milestoneName: m?.milestone_name, description: m?.description, targetDate: m?.target_date,
          forecastDate: m?.forecast_date, actualDate: m?.actual_date, status: m?.status, notes: m?.notes,
        }))
        setLoading(false)
      } else {
        setInitialSnapshot(snapshotOf({
          milestoneName: '', description: '', targetDate: '', forecastDate: '', actualDate: '', status: 'planned', notes: '',
        }))
      }
    })()
    return () => { cancelled = true }
  }, [id, isEdit])

  const isDirty = useMemo(() => {
    if (initialSnapshot === null) return false
    return snapshotOf({ milestoneName, description, targetDate, forecastDate, actualDate, status, notes }) !== initialSnapshot
  }, [milestoneName, description, targetDate, forecastDate, actualDate, status, notes, initialSnapshot])

  const { requestNavigation, confirmDiscard } = useUnsavedChangesGuard(
    isDirty,
    'You have unsaved changes to this milestone.'
  )

  const projectSuffix = routeKey ? `?projectId=${encodeURIComponent(routeKey)}` : ''
  const listPath = `/platform/milestones${projectSuffix}`

  const handleSave = async () => {
    if (!milestoneName.trim() || !targetDate) return
    setSaving(true)
    const payload = {
      milestoneName: milestoneName.trim(),
      description: description.trim() || null,
      targetDate,
      forecastDate: forecastDate || targetDate,
      actualDate: actualDate || null,
      status,
      notes: notes.trim() || null,
    }
    const result = isEdit
      ? await updateMilestone(id, payload)
      : await createMilestone({ projectId: projectId || searchParams.get('projectId'), ...payload })
    setSaving(false)
    if (!result.success) return

    showSuccess({
      recordId: isEdit ? id : result.data?.id,
      operation: isEdit ? 'updated' : 'created',
      onOk: () => navigate(listPath, { replace: true }),
    })
  }

  const handleCancel = () => {
    if (isDirty) confirmDiscard(() => navigate(listPath))
    else requestNavigation(listPath)
  }

  if (loading) {
    return <div className="p-8 text-gray-500 dark:text-gray-400">Loading…</div>
  }

  return (
    <div className="p-4 sm:p-6 max-w-3xl mx-auto space-y-6">
      <button type="button" onClick={handleCancel} className="inline-flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200">
        <ArrowLeft className="h-4 w-4" />
        Back to Milestone Register
      </button>

      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
        {isEdit ? 'Edit Milestone' : 'New Milestone'}
      </h1>

      <div className="space-y-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Milestone Name *</label>
          <input type="text" value={milestoneName} onChange={(e) => setMilestoneName(e.target.value)} placeholder="e.g. Design Sign-off" className={inputClass} />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className={inputClass} />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Target Date *</label>
            <input type="date" value={targetDate} onChange={(e) => setTargetDate(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Forecast Date</label>
            <input type="date" value={forecastDate} onChange={(e) => setForecastDate(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Actual Date</label>
            <input type="date" value={actualDate} onChange={(e) => setActualDate(e.target.value)} className={inputClass} />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Status</label>
          <select value={status} onChange={(e) => setStatus(e.target.value)} className={inputClass}>
            {MILESTONE_STATUSES.map((s) => (
              <option key={s} value={s}>{STATUS_LABELS[s] || s}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notes</label>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className={inputClass} />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving || !milestoneName.trim() || !targetDate}
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
