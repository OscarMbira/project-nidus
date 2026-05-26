import { useState, useEffect } from 'react'
import { X, Save, PauseCircle } from 'lucide-react'
import { SEAM_LEVELS, prettySeamLevel } from '../../utils/stakeholderSEAMUtils'
import { saveDraft } from '../../services/draftQueueService'

import { getDisplayRowNumber } from '../../utils/tableRowNumberUtils'
export default function StakeholderAssessmentMatrixForm({
  record,
  projectId,
  stakeholders = [],
  onSave,
  onCancel,
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
    } else if (projectId) {
      setFormData((prev) => ({ ...prev, project_id: projectId }))
    }
  }, [record, projectId])

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
    'w-full px-3 py-2 border border-gray-600 rounded-lg bg-gray-800 text-gray-100 focus:ring-2 focus:ring-blue-500'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
      <div className="w-full max-w-lg rounded-xl border border-gray-700 bg-gray-900 shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-700 px-4 py-3">
          <h2 className="text-lg font-semibold text-white">
            {record?.id ? 'Edit Assessment' : 'Add Assessment'}
          </h2>
          <button type="button" onClick={onCancel} className="p-1 text-gray-400 hover:text-white rounded">
            <X className="h-5 w-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {error && (
            <p className="text-sm text-red-400 bg-red-950/50 border border-red-800 rounded-lg px-3 py-2">
              {error}
            </p>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Stakeholder *</label>
            <select
              name="stakeholder_id"
              value={formData.stakeholder_id}
              onChange={handleChange}
              disabled={!!record?.id}
              required
              className={fieldClass}
            >
              <option value="">Select stakeholder</option>
              {stakeholders.map((s, index) => (
                <option key={s.id} value={s.id}>
                  {s.stakeholder_name}
                  {s.stakeholder_reference ? ` (${s.stakeholder_reference})` : ''}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Assessment date *</label>
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
              <label className="block text-sm font-medium text-gray-300 mb-1">Current level (C) *</label>
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
              <label className="block text-sm font-medium text-gray-300 mb-1">Desired level (D) *</label>
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
            <label className="block text-sm font-medium text-gray-300 mb-1">Notes</label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              rows={3}
              className={fieldClass}
            />
          </div>
          <div className="flex flex-wrap gap-2 justify-end pt-2 border-t border-gray-700">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-gray-300 hover:bg-gray-800 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleHold}
              disabled={holding || saving}
              className="inline-flex items-center gap-2 px-4 py-2 border border-amber-600/50 text-amber-200 rounded-lg hover:bg-amber-950/40 disabled:opacity-50"
            >
              <PauseCircle className="h-4 w-4" />
              Save as Draft
            </button>
            <button
              type="submit"
              disabled={saving || holding}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              {saving ? 'Saving…' : record?.id ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
