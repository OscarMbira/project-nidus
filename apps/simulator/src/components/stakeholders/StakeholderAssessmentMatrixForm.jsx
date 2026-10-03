import { useState, useEffect, useMemo } from 'react'
import { Save, PauseCircle } from 'lucide-react'
import { SEAM_LEVELS, prettySeamLevel } from '@nidus/shared/utils/stakeholderSEAMUtils'
import { saveDraft } from '../../services/draftQueueService'
import { platformDb } from '@nidus/supabase'
import DetailAuditTabList from '@nidus/ui/DetailAuditTabList'
import AuditDetailsPanel from '@nidus/ui/AuditDetailsPanel'
import AuditCard from '@nidus/ui/AuditCard'
import AuditField from '@nidus/ui/AuditField'
import AuditTimestampPair from '@nidus/ui/AuditTimestampPair'
import SelectField from '@nidus/ui/SelectField'
import { resolveAuditUserLabels } from '@nidus/shared/utils/auditDisplayUtils'
import { useUnsavedChangesGuard } from '@nidus/shared/context/UnsavedChangesContext'

function formSnapshot(data) {
  return JSON.stringify({
    stakeholder_id: data.stakeholder_id || '',
    assessment_date: data.assessment_date || '',
    current_level: data.current_level || '',
    desired_level: data.desired_level || '',
    notes: data.notes || '',
  })
}

export default function StakeholderAssessmentMatrixForm({
  record,
  projectId,
  stakeholders = [],
  onSave,
  onCancel,
  readOnly = false,
  entityType = 'stakeholder_assessment_matrix',
  formRoute = '/platform/stakeholders/assessment-matrix',
}) {
  const [formData, setFormData] = useState({
    stakeholder_id: '',
    project_id: projectId || '',
    assessment_date: new Date().toISOString().split('T')[0],
    current_level: 'neutral',
    desired_level: 'supportive',
    notes: '',
  })
  const [saving, setSaving] = useState(false)
  const [holding, setHolding] = useState(false)
  const [error, setError] = useState(null)
  const [formTab, setFormTab] = useState('details')
  const [auditUserLabels, setAuditUserLabels] = useState({})
  const [baseline, setBaseline] = useState(() => formSnapshot({
    stakeholder_id: '',
    assessment_date: new Date().toISOString().split('T')[0],
    current_level: 'neutral',
    desired_level: 'supportive',
    notes: '',
  }))

  useEffect(() => {
    if (formTab !== 'audit' || !record) return
    let cancelled = false
    ;(async () => {
      const labels = await resolveAuditUserLabels(platformDb, [
        record.created_by,
        record.updated_by,
      ])
      if (!cancelled) setAuditUserLabels(labels || {})
    })()
    return () => { cancelled = true }
  }, [formTab, record])

  useEffect(() => {
    if (record) {
      setFormData({
        stakeholder_id: record.stakeholder_id || '',
        project_id: record.project_id || projectId || '',
        assessment_date: record.assessment_date || new Date().toISOString().split('T')[0],
        current_level: record.current_level || 'neutral',
        desired_level: record.desired_level || 'supportive',
        notes: record.notes || '',
      })
      setBaseline(formSnapshot({
        stakeholder_id: record.stakeholder_id || '',
        assessment_date: record.assessment_date || new Date().toISOString().split('T')[0],
        current_level: record.current_level || 'neutral',
        desired_level: record.desired_level || 'supportive',
        notes: record.notes || '',
      }))
    } else if (projectId) {
      setFormData((prev) => ({ ...prev, project_id: projectId }))
    }
  }, [record, projectId])

  const isDirty = useMemo(
    () => !readOnly && formSnapshot(formData) !== baseline,
    [formData, baseline, readOnly],
  )
  const { confirmDiscard } = useUnsavedChangesGuard(isDirty, 'Discard changes to this assessment?')
  const stakeholderOptions = stakeholders.map((person) => ({
    value: person.id,
    label: `${person.stakeholder_name || 'Stakeholder'}${person.stakeholder_reference ? ` (${person.stakeholder_reference})` : ''}`,
  }))
  const title = readOnly ? 'View assessment' : (record?.id ? 'Edit assessment' : 'Add assessment')

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    if (!formData.stakeholder_id) {
      setError('Select a stakeholder.')
      return
    }
    if (!formData.project_id) {
      setError('Project is required.')
      return
    }
    setSaving(true)
    try {
      await onSave(formData)
    } catch (err) {
      setError(err?.message || 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  const handleHold = async () => {
    setHolding(true)
    setError(null)
    try {
      const title =
        stakeholders.find((s) => s.id === formData.stakeholder_id)?.stakeholder_name ||
        'Assessment draft'
      const draftPayload =
        entityType === 'practice_stakeholder_assessment_matrix'
          ? {
              ...formData,
              practice_project_id: formData.project_id,
              practice_stakeholder_id: formData.stakeholder_id,
            }
          : formData
      await saveDraft(entityType, draftPayload, record?.id || null, {
        projectId: formData.project_id,
        entityTitle: title,
        formRoute,
      })
      onCancel?.()
    } catch (err) {
      setError(err?.message || 'Could not save draft')
    } finally {
      setHolding(false)
    }
  }

  const fieldClass =
    'w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500'

  return (
    <div className="mx-auto w-full max-w-3xl rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
        <div className="border-b border-gray-200 px-4 py-4 dark:border-gray-700">
          <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">{title}</h1>
        </div>
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <DetailAuditTabList activeTab={formTab} onChange={setFormTab} />

          {formTab === 'audit' && (
            !record?.id ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">Audit details appear after this assessment is saved.</p>
            ) : (
              <AuditDetailsPanel description="Who created or changed this assessment, and how it is classified.">
                <AuditCard title="Identity" description="How this assessment is labelled and tracked.">
                  <AuditField label="Stakeholder" value={stakeholders.find((s) => s.id === (formData.stakeholder_id || record.stakeholder_id))?.stakeholder_name} />
                  <AuditField label="Assessment date" value={formData.assessment_date || record.assessment_date} />
                </AuditCard>
                <AuditCard title="Classification" description="Where this assessment sits.">
                  <AuditField label="Current level" value={prettySeamLevel(formData.current_level || record.current_level)} />
                  <AuditField label="Desired level" value={prettySeamLevel(formData.desired_level || record.desired_level)} />
                </AuditCard>
                <AuditCard title="Record history" description="When this assessment was created and last changed.">
                  <AuditField label="Created by" value={record.created_by ? auditUserLabels[record.created_by] || null : null} />
                  <AuditTimestampPair dateLabel="Created at" value={record.created_at} />
                  <AuditField label="Updated by" value={record.updated_by ? auditUserLabels[record.updated_by] || null : null} />
                  <AuditTimestampPair dateLabel="Last updated" value={record.updated_at} />
                </AuditCard>
              </AuditDetailsPanel>
            )
          )}

          {formTab === 'details' && (
          <fieldset disabled={readOnly} className="space-y-4 disabled:opacity-80">
          {error && (
            <p className="text-sm text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 rounded-lg px-3 py-2">
              {error}
            </p>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Stakeholder *</label>
            <SelectField
              value={formData.stakeholder_id}
              onChange={(value) => setFormData((prev) => ({ ...prev, stakeholder_id: value }))}
              options={stakeholderOptions}
              placeholder="Select stakeholder"
              disabled={readOnly || !!record?.id}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Assessment date *</label>
            <input
              type="date"
              name="assessment_date"
              value={formData.assessment_date}
              onChange={handleChange}
              required
              className={fieldClass}
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Current level (C) *</label>
              <select
                name="current_level"
                value={formData.current_level}
                onChange={handleChange}
                className={fieldClass}
              >
                {SEAM_LEVELS.map((l, index) => (
                  <option key={l} value={l}>
                    {prettySeamLevel(l)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Desired level (D) *</label>
              <select
                name="desired_level"
                value={formData.desired_level}
                onChange={handleChange}
                className={fieldClass}
              >
                {SEAM_LEVELS.map((l, index) => (
                  <option key={l} value={l}>
                    {prettySeamLevel(l)}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Notes</label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              rows={3}
              className={fieldClass}
            />
          </div>
          </fieldset>
          )}
          <div className="flex flex-wrap gap-2 justify-end pt-2 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={() => confirmDiscard(() => onCancel?.())}
              className="px-4 py-2 text-gray-800 hover:bg-gray-100 dark:text-gray-100 dark:hover:bg-gray-700 rounded-lg"
            >
              {readOnly ? 'Back' : 'Cancel'}
            </button>
            {!readOnly && (
              <button
                type="button"
                onClick={handleHold}
                disabled={holding || saving}
                className="inline-flex items-center gap-2 px-4 py-2 border border-amber-600 text-amber-800 dark:text-amber-200 rounded-lg hover:bg-amber-50 dark:hover:bg-amber-950/40 disabled:opacity-50"
              >
                <PauseCircle className="h-4 w-4" />
                Save as Draft
              </button>
            )}
            {!readOnly && (
              <button
                type="submit"
                disabled={saving || holding}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50"
              >
                <Save className="h-4 w-4" />
                {saving ? 'Saving…' : record?.id ? 'Update' : 'Create'}
              </button>
            )}
          </div>
        </form>
    </div>
  )
}
