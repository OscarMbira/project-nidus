import { useState } from 'react'
import { format, subDays } from 'date-fns'
import { FileText, Save, X, Calendar } from 'lucide-react'
import { createHighlightReport } from '../../services/controllingStageService'

export default function HighlightReport({ projectId, stageBoundaryId, onSave, onCancel, embedded = false }) {
  const [formData, setFormData] = useState({
    reporting_period_start: format(subDays(new Date(), 7), 'yyyy-MM-dd'),
    reporting_period_end: format(new Date(), 'yyyy-MM-dd'),
    report_title: 'Highlight Report',
    executive_summary: '',
    stage_status: 'on_track',
    overall_status_summary: '',
    progress_summary: '',
    completed_this_period: '',
    planned_next_period: '',
    budget_status: '',
    budget_variance: '',
    budget_forecast: '',
    schedule_status: '',
    schedule_variance_days: '',
    schedule_forecast: '',
    quality_status: '',
    quality_issues: '',
    risks_summary: '',
    top_risks: '',
    risk_mitigation_status: '',
    issues_summary: '',
    top_issues: '',
    issue_resolution_status: '',
    changes_summary: '',
    approved_changes: '',
    pending_changes: '',
    decisions_required: '',
    recommendations: '',
  })
  const [saving, setSaving] = useState(false)

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)

    try {
      const submitData = {
        ...formData,
        report_date: formData.reporting_period_end || format(new Date(), 'yyyy-MM-dd'),
        reporting_period_start: formData.reporting_period_start,
        reporting_period_end: formData.reporting_period_end,
        budget_variance: formData.budget_variance ? parseFloat(formData.budget_variance) : null,
        schedule_variance_days: formData.schedule_variance_days ? parseInt(formData.schedule_variance_days, 10) : null,
      }
      await createHighlightReport(projectId, submitData, stageBoundaryId || null)
      onSave()
    } catch (error) {
      console.error('Error saving highlight report:', error)
      alert('Error saving highlight report: ' + error.message)
    } finally {
      setSaving(false)
    }
  }

  const outerClass = embedded
    ? 'max-w-5xl w-full'
    : 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4'

  return (
    <div className={outerClass}>
      {!embedded && <div className="absolute inset-0" aria-hidden="true" />}
      <div className={`bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 max-w-5xl w-full ${embedded ? '' : 'shadow-xl max-h-[90vh] overflow-y-auto relative z-10'}`}>
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-6 flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <FileText className="h-6 w-6" />
              Create Highlight Report
            </h2>
            {!embedded && (
              <button
                onClick={onCancel}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X className="h-6 w-6" />
              </button>
            )}
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Report Period */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <Calendar className="h-4 w-4 inline mr-1" />
                Reporting Period Start *
              </label>
              <input
                type="date"
                name="reporting_period_start"
                value={formData.reporting_period_start}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <Calendar className="h-4 w-4 inline mr-1" />
                Reporting Period End *
              </label>
              <input
                type="date"
                name="reporting_period_end"
                value={formData.reporting_period_end}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Report Title
              </label>
              <input
                type="text"
                name="report_title"
                value={formData.report_title}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
            </div>
          </div>

          {/* Executive Summary */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Executive Summary *
            </label>
            <textarea
              name="executive_summary"
              value={formData.executive_summary}
              onChange={handleChange}
              rows={4}
              required
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              placeholder="High-level summary for Project Board..."
            />
          </div>

          {/* Status */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Stage Status
              </label>
              <select
                name="stage_status"
                value={formData.stage_status}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              >
                <option value="on_track">On Track</option>
                <option value="at_risk">At Risk</option>
                <option value="off_track">Off Track</option>
                <option value="exception">Exception</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Overall Status Summary
              </label>
              <textarea
                name="overall_status_summary"
                value={formData.overall_status_summary}
                onChange={handleChange}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
            </div>
          </div>

          {/* Progress */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Progress</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Progress Summary
                </label>
                <textarea
                  name="progress_summary"
                  value={formData.progress_summary}
                  onChange={handleChange}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Completed This Period
                  </label>
                  <textarea
                    name="completed_this_period"
                    value={formData.completed_this_period}
                    onChange={handleChange}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Planned Next Period
                  </label>
                  <textarea
                    name="planned_next_period"
                    value={formData.planned_next_period}
                    onChange={handleChange}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Budget & Schedule */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Budget & Schedule</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Budget Status
                </label>
                <textarea
                  name="budget_status"
                  value={formData.budget_status}
                  onChange={handleChange}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Budget Variance
                </label>
                <input
                  type="number"
                  name="budget_variance"
                  value={formData.budget_variance}
                  onChange={handleChange}
                  step="0.01"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Schedule Status
                </label>
                <textarea
                  name="schedule_status"
                  value={formData.schedule_status}
                  onChange={handleChange}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Schedule Variance (Days)
                </label>
                <input
                  type="number"
                  name="schedule_variance_days"
                  value={formData.schedule_variance_days}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
              </div>
            </div>
          </div>

          {/* Risks & Issues */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Risks & Issues</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Risks Summary
                </label>
                <textarea
                  name="risks_summary"
                  value={formData.risks_summary}
                  onChange={handleChange}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Issues Summary
                </label>
                <textarea
                  name="issues_summary"
                  value={formData.issues_summary}
                  onChange={handleChange}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
              </div>
            </div>
          </div>

          {/* Decisions & Recommendations */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Decisions & Recommendations</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Decisions Required
                </label>
                <textarea
                  name="decisions_required"
                  value={formData.decisions_required}
                  onChange={handleChange}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Recommendations
                </label>
                <textarea
                  name="recommendations"
                  value={formData.recommendations}
                  onChange={handleChange}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2 disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              {saving ? 'Saving...' : 'Save Report'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

