import { useState } from 'react'
import { FieldHelpScope } from '@nidus/shared/context/FieldHelpContext'
import FieldLabelWithHelp from '@nidus/ui/FieldLabelWithHelp'
import { supabase } from '../../services/supabaseClient'
import { format } from 'date-fns'
import { FileText, Save, X, Calendar, User } from 'lucide-react'

function CheckpointReportBody({ projectId, stageBoundaryId, workPackageId, onSave, onCancel }) {
  const [formData, setFormData] = useState({
    checkpoint_date: format(new Date(), 'yyyy-MM-dd'),
    report_title: '',
    report_summary: '',
    progress_summary: '',
    completed_work: '',
    work_in_progress: '',
    planned_work: '',
    issues_summary: '',
    risks_summary: '',
    changes_summary: '',
    quality_status: '',
    quality_concerns: '',
    budget_status: '',
    schedule_status: '',
    variance_analysis: '',
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
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('User not authenticated')

      const { error } = await supabase
        .from('checkpoint_reports')
        .insert({
          ...formData,
          project_id: projectId,
          stage_boundary_id: stageBoundaryId || null,
          work_package_id: workPackageId || null,
          reported_by_user_id: user.id,
          status: 'draft',
          created_by: user.id,
          updated_by: user.id,
        })

      if (error) throw error
      onSave()
    } catch (error) {
      console.error('Error saving checkpoint report:', error)
      alert('Error saving checkpoint report: ' + error.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-6 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <FileText className="h-6 w-6" />
            Create Checkpoint Report
          </h2>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <FieldLabelWithHelp helpKey="public.checkpoint_reports.checkpoint_date" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2" required>
                <Calendar className="h-4 w-4 inline mr-1" />
                Checkpoint Date *
              </FieldLabelWithHelp>
              <input
                type="date"
                name="checkpoint_date"
                value={formData.checkpoint_date}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
            </div>
            <div>
              <FieldLabelWithHelp helpKey="public.checkpoint_reports.report_title" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Report Title
              </FieldLabelWithHelp>
              <input
                type="text"
                name="report_title"
                value={formData.report_title}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                placeholder="Checkpoint Report - Week X"
              />
            </div>
          </div>

          <div>
            <FieldLabelWithHelp helpKey="public.checkpoint_reports.report_summary" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2" required>
              Report Summary *
            </FieldLabelWithHelp>
            <textarea
              name="report_summary"
              value={formData.report_summary}
              onChange={handleChange}
              rows={3}
              required
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              placeholder="Executive summary of the checkpoint..."
            />
          </div>

          <div>
            <FieldLabelWithHelp helpKey="public.checkpoint_reports.progress_summary" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2" required>
              Progress Summary *
            </FieldLabelWithHelp>
            <textarea
              name="progress_summary"
              value={formData.progress_summary}
              onChange={handleChange}
              rows={3}
              required
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <FieldLabelWithHelp helpKey="public.checkpoint_reports.completed_work" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Completed Work
              </FieldLabelWithHelp>
              <textarea
                name="completed_work"
                value={formData.completed_work}
                onChange={handleChange}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
            </div>
            <div>
              <FieldLabelWithHelp helpKey="public.checkpoint_reports.work_in_progress" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Work In Progress
              </FieldLabelWithHelp>
              <textarea
                name="work_in_progress"
                value={formData.work_in_progress}
                onChange={handleChange}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
            </div>
            <div>
              <FieldLabelWithHelp helpKey="public.checkpoint_reports.planned_work" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Planned Work
              </FieldLabelWithHelp>
              <textarea
                name="planned_work"
                value={formData.planned_work}
                onChange={handleChange}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <FieldLabelWithHelp helpKey="public.checkpoint_reports.issues_summary" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Issues Summary
              </FieldLabelWithHelp>
              <textarea
                name="issues_summary"
                value={formData.issues_summary}
                onChange={handleChange}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
            </div>
            <div>
              <FieldLabelWithHelp helpKey="public.checkpoint_reports.risks_summary" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Risks Summary
              </FieldLabelWithHelp>
              <textarea
                name="risks_summary"
                value={formData.risks_summary}
                onChange={handleChange}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
            </div>
            <div>
              <FieldLabelWithHelp helpKey="public.checkpoint_reports.changes_summary" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Changes Summary
              </FieldLabelWithHelp>
              <textarea
                name="changes_summary"
                value={formData.changes_summary}
                onChange={handleChange}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <FieldLabelWithHelp helpKey="public.checkpoint_reports.quality_status" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Quality Status
              </FieldLabelWithHelp>
              <textarea
                name="quality_status"
                value={formData.quality_status}
                onChange={handleChange}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
            </div>
            <div>
              <FieldLabelWithHelp helpKey="public.checkpoint_reports.quality_concerns" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Quality Concerns
              </FieldLabelWithHelp>
              <textarea
                name="quality_concerns"
                value={formData.quality_concerns}
                onChange={handleChange}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <FieldLabelWithHelp helpKey="public.checkpoint_reports.budget_status" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Budget Status
              </FieldLabelWithHelp>
              <textarea
                name="budget_status"
                value={formData.budget_status}
                onChange={handleChange}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
            </div>
            <div>
              <FieldLabelWithHelp helpKey="public.checkpoint_reports.schedule_status" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Schedule Status
              </FieldLabelWithHelp>
              <textarea
                name="schedule_status"
                value={formData.schedule_status}
                onChange={handleChange}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
            </div>
            <div>
              <FieldLabelWithHelp helpKey="public.checkpoint_reports.variance_analysis" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Variance Analysis
              </FieldLabelWithHelp>
              <textarea
                name="variance_analysis"
                value={formData.variance_analysis}
                onChange={handleChange}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
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

// v1345 slice 4: field help for this component (public.checkpoint_reports.<column>). It carries its own scope,
// so every page that renders it shows the help.
const HELP_KEYS = [
  'checkpoint_date', 'report_title', 'report_summary', 'progress_summary', 'completed_work',
  'work_in_progress', 'planned_work', 'issues_summary', 'risks_summary', 'changes_summary',
  'quality_status', 'quality_concerns', 'budget_status', 'schedule_status', 'variance_analysis',
].map((name) => `public.checkpoint_reports.${name}`)

export default function CheckpointReport(props) {
  return (
    <FieldHelpScope helpKeys={HELP_KEYS}>
      <CheckpointReportBody {...props} />
    </FieldHelpScope>
  )
}
