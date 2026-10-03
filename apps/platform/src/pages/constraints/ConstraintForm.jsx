/**
 * Constraints Register — create/edit form (v1100). Routed page per rule 65 (no modal).
 * Success modal (rule 16) and unsaved-changes guard (rule 52). Mirrors
 * apps/platform/src/pages/assumptions/AssumptionForm.jsx's structure.
 */
import { useState, useEffect, useMemo } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { useSuccessModal } from '@nidus/shared/hooks/useSuccessModal'
import { useUnsavedChangesGuard } from '@nidus/shared/context/UnsavedChangesContext'
import { usePlatformProjectId } from '@nidus/shared/hooks/usePlatformProjectId.js'
import SelectField from '@nidus/ui/SelectField'
import { getConstraint, createConstraint, updateConstraint } from '../../services/constraintService'
import { getProjectMembers } from '../../services/projectMembershipService'

const inputClass =
  'w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm'

const CATEGORY_OPTIONS = [
  { value: 'budget', label: 'Budget' },
  { value: 'schedule', label: 'Schedule' },
  { value: 'resource', label: 'Resource' },
  { value: 'regulatory', label: 'Regulatory' },
  { value: 'technical', label: 'Technical' },
  { value: 'other', label: 'Other' },
]

const IMPACT_OPTIONS = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'critical', label: 'Critical' },
]

const STATUS_OPTIONS = [
  { value: 'open', label: 'Open' },
  { value: 'managed', label: 'Managed' },
  { value: 'resolved', label: 'Resolved' },
]

export default function ConstraintForm() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { projectId, routeKey } = usePlatformProjectId()
  const { showSuccess, modal } = useSuccessModal()
  const isEdit = !!id

  const [loading, setLoading] = useState(isEdit)
  const [saving, setSaving] = useState(false)
  const [teamMembers, setTeamMembers] = useState([])
  const [constraintText, setConstraintText] = useState('')
  const [category, setCategory] = useState('')
  const [status, setStatus] = useState('open')
  const [ownerUserId, setOwnerUserId] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [impactSeverity, setImpactSeverity] = useState('')
  const [notes, setNotes] = useState('')
  const [initialSnapshot, setInitialSnapshot] = useState(null)

  const effectiveProjectId = projectId || searchParams.get('projectId')

  useEffect(() => {
    if (!effectiveProjectId) return
    let cancelled = false
    ;(async () => {
      const result = await getProjectMembers(effectiveProjectId)
      if (!cancelled) setTeamMembers(result.success ? result.data : [])
    })()
    return () => { cancelled = true }
  }, [effectiveProjectId])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      if (isEdit) {
        setLoading(true)
        const result = await getConstraint(id)
        if (cancelled) return
        const c = result.data
        setConstraintText(c?.constraint_text || '')
        setCategory(c?.category || '')
        setStatus(c?.status || 'open')
        setOwnerUserId(c?.owner_user_id || '')
        setDueDate(c?.due_date || '')
        setImpactSeverity(c?.impact_severity || '')
        setNotes(c?.notes || '')
        setInitialSnapshot(JSON.stringify({
          constraintText: c?.constraint_text, category: c?.category, status: c?.status,
          ownerUserId: c?.owner_user_id, dueDate: c?.due_date, impactSeverity: c?.impact_severity,
          notes: c?.notes,
        }))
        setLoading(false)
      } else {
        setInitialSnapshot(JSON.stringify({
          constraintText: '', category: '', status: 'open', ownerUserId: '', dueDate: '',
          impactSeverity: '', notes: '',
        }))
      }
    })()
    return () => { cancelled = true }
  }, [id, isEdit])

  const isDirty = useMemo(() => {
    if (initialSnapshot === null) return false
    return JSON.stringify({ constraintText, category, status, ownerUserId, dueDate, impactSeverity, notes }) !== initialSnapshot
  }, [constraintText, category, status, ownerUserId, dueDate, impactSeverity, notes, initialSnapshot])

  const { requestNavigation, confirmDiscard } = useUnsavedChangesGuard(
    isDirty,
    'You have unsaved changes to this constraint.'
  )

  const projectSuffix = routeKey ? `?projectId=${encodeURIComponent(routeKey)}` : ''
  const listPath = `/platform/constraints${projectSuffix}`

  const ownerOptions = teamMembers.map((m) => ({
    value: m.user_id,
    label: m.user?.full_name || m.user?.email || 'Unknown',
  }))

  const handleSave = async () => {
    if (!constraintText.trim()) return
    setSaving(true)
    const result = isEdit
      ? await updateConstraint(id, {
          constraintText: constraintText.trim(), category: category || null, status,
          ownerUserId: ownerUserId || null, dueDate: dueDate || null,
          impactSeverity: impactSeverity || null, notes: notes.trim() || null,
        })
      : await createConstraint({
          projectId: effectiveProjectId,
          constraintText: constraintText.trim(), category: category || null, status,
          ownerUserId: ownerUserId || null, dueDate: dueDate || null,
          impactSeverity: impactSeverity || null, notes: notes.trim() || null,
        })
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
        Back to Constraints Register
      </button>

      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
        {isEdit ? 'Edit Constraint' : 'New Constraint'}
      </h1>

      <div className="space-y-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Constraint *</label>
          <textarea
            value={constraintText}
            onChange={(e) => setConstraintText(e.target.value)}
            rows={3}
            placeholder="e.g. Must go live before end of fiscal year"
            className={inputClass}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Category</label>
            <SelectField
              options={CATEGORY_OPTIONS}
              value={category}
              onChange={setCategory}
              placeholder="Not categorized"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Status</label>
            <SelectField
              options={STATUS_OPTIONS}
              value={status}
              onChange={setStatus}
              placeholder="Select status"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Owner</label>
            <SelectField
              options={ownerOptions}
              value={ownerUserId}
              onChange={setOwnerUserId}
              placeholder="Unassigned"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Due date</label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Impact</label>
            <SelectField
              options={IMPACT_OPTIONS}
              value={impactSeverity}
              onChange={setImpactSeverity}
              placeholder="Not set"
            />
          </div>
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
          disabled={saving || !constraintText.trim()}
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
