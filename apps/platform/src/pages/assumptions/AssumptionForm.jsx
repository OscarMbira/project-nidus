/**
 * Assumptions Register — create/edit form (v963 Phase 3; v1100 enrichment). Routed page per
 * rule 65 (no modal). Success modal (rule 16) and unsaved-changes guard (rule 52).
 */
import { useState, useEffect, useMemo } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { useSuccessModal } from '@nidus/shared/hooks/useSuccessModal'
import { useUnsavedChangesGuard } from '@nidus/shared/context/UnsavedChangesContext'
import { usePlatformProjectId } from '@nidus/shared/hooks/usePlatformProjectId.js'
import SelectField from '@nidus/ui/SelectField'
import { getAssumption, createAssumption, updateAssumption } from '../../services/assumptionService'
import { getProjectMembers } from '../../services/projectMembershipService'

const inputClass =
  'w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm'

function friendlyAssumptionLabel(text) {
  const singleLine = String(text || '').trim().replace(/\s+/g, ' ')
  if (!singleLine) return 'Assumption'
  return singleLine.length > 60 ? `${singleLine.slice(0, 57)}…` : singleLine
}

const STATUS_OPTIONS = [
  { value: 'active', label: 'Active' },
  { value: 'validated', label: 'Validated' },
  { value: 'invalidated', label: 'Invalidated' },
  { value: 'closed', label: 'Closed' },
]

const IMPACT_OPTIONS = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'critical', label: 'Critical' },
]

export default function AssumptionForm() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { projectId, routeKey } = usePlatformProjectId()
  const { showSuccess, modal } = useSuccessModal()
  const isEdit = !!id

  const [loading, setLoading] = useState(isEdit)
  const [saving, setSaving] = useState(false)
  const [teamMembers, setTeamMembers] = useState([])
  const [assumptionText, setAssumptionText] = useState('')
  const [validationStatus, setValidationStatus] = useState('active')
  const [ownerUserId, setOwnerUserId] = useState('')
  const [impactSeverity, setImpactSeverity] = useState('')
  const [nextReviewDate, setNextReviewDate] = useState('')
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
        const result = await getAssumption(id)
        if (cancelled) return
        const a = result.data
        setAssumptionText(a?.assumption_text || '')
        setValidationStatus(a?.validation_status || 'active')
        setOwnerUserId(a?.owner_user_id || '')
        setImpactSeverity(a?.impact_severity || '')
        setNextReviewDate(a?.next_review_date || '')
        setNotes(a?.notes || '')
        setInitialSnapshot(JSON.stringify({
          assumptionText: a?.assumption_text, validationStatus: a?.validation_status,
          ownerUserId: a?.owner_user_id, impactSeverity: a?.impact_severity,
          nextReviewDate: a?.next_review_date, notes: a?.notes,
        }))
        setLoading(false)
      } else {
        setInitialSnapshot(JSON.stringify({
          assumptionText: '', validationStatus: 'active', ownerUserId: '', impactSeverity: '',
          nextReviewDate: '', notes: '',
        }))
      }
    })()
    return () => { cancelled = true }
  }, [id, isEdit])

  const isDirty = useMemo(() => {
    if (initialSnapshot === null) return false
    return JSON.stringify({ assumptionText, validationStatus, ownerUserId, impactSeverity, nextReviewDate, notes }) !== initialSnapshot
  }, [assumptionText, validationStatus, ownerUserId, impactSeverity, nextReviewDate, notes, initialSnapshot])

  const { requestNavigation, confirmDiscard } = useUnsavedChangesGuard(
    isDirty,
    'You have unsaved changes to this assumption.'
  )

  const projectSuffix = routeKey ? `?projectId=${encodeURIComponent(routeKey)}` : ''
  const listPath = `/platform/assumptions${projectSuffix}`

  const handleSave = async () => {
    if (!assumptionText.trim()) return
    setSaving(true)
    const result = isEdit
      ? await updateAssumption(id, {
          assumptionText: assumptionText.trim(), validationStatus, ownerUserId: ownerUserId || null,
          impactSeverity: impactSeverity || null, nextReviewDate: nextReviewDate || null,
          notes: notes.trim() || null,
        })
      : await createAssumption({
          projectId: projectId || searchParams.get('projectId'),
          assumptionText: assumptionText.trim(),
          validationStatus,
          ownerUserId: ownerUserId || null,
          impactSeverity: impactSeverity || null,
          nextReviewDate: nextReviewDate || null,
          notes: notes.trim() || null,
        })
    setSaving(false)
    if (!result.success) return

    showSuccess({
      subject: friendlyAssumptionLabel(assumptionText),
      recordId: result.data?.assumption_code || undefined,
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
        Back to Assumptions Register
      </button>

      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
        {isEdit ? 'Edit Assumption' : 'New Assumption'}
      </h1>

      <div className="space-y-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Assumption *</label>
          <textarea
            value={assumptionText}
            onChange={(e) => setAssumptionText(e.target.value)}
            rows={3}
            placeholder="e.g. Stakeholder sign-off will be available within 5 working days"
            className={inputClass}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Validation Status</label>
            <SelectField
              options={STATUS_OPTIONS}
              value={validationStatus}
              onChange={setValidationStatus}
              placeholder="Select status"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Owner</label>
            <SelectField
              forceSearchable
              descriptionColumnLabel="Role"
              options={[
                { value: '', label: 'Unassigned', description: '' },
                ...teamMembers.map((m) => ({
                  value: m.user_id,
                  label: m.user?.full_name || m.user?.email || 'Unknown',
                  description: m.role?.role_display_name || '',
                })),
              ]}
              value={ownerUserId}
              onChange={setOwnerUserId}
              placeholder="Unassigned"
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
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Next review date</label>
            <input
              type="date"
              value={nextReviewDate}
              onChange={(e) => setNextReviewDate(e.target.value)}
              className={inputClass}
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
          disabled={saving || !assumptionText.trim()}
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
